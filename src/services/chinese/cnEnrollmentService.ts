/* ════════════════════════════════════════════════════════════════════════
   cnEnrollmentService.ts — Follow an admin set. Progress stays on the word.
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { bucketWordProgress, type ProgressBucketRow } from '@/lib/chinese/masteryModel';
import { GLOBAL_SAMPLE_SET_DESCRIPTION } from '@/lib/chinese/hsk1SampleSets';
import {
	activateSetInSrs,
	deactivateSetFromSrs,
	enrollWordsInSrs,
} from '@/services/chinese/cnSrsEnrollmentService';
import {
	countDueChannelsForProgressList,
	fetchProgressDueCandidates,
	loadWordIdsWithFillExamples,
} from '@/services/chinese/cnSrsService';
import type { CnWordSetListItemDTO } from '@/types/chinese';

const LEVEL_SELECT = {
	wordId: true,
	state: true,
	introducedAt: true,
	meaningIntervalIdx: true,
	soundIntervalIdx: true,
	sentenceIntervalIdx: true,
	meaningCorrect: true,
	meaningTotal: true,
	soundCorrect: true,
	soundTotal: true,
	sentenceCorrect: true,
	sentenceTotal: true,
} as const;

export interface ExploreSetCard {
	id: string;
	title: string;
	description: string;
	level: number | null;
	itemCount: number;
	sampleWords: string[];
	enrolled: boolean;
	starter: boolean;
	updatedAt: string;
}

export async function canViewSet(userId: string, setId: string): Promise<boolean> {
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId },
		select: {
			userId: true,
			shared: true,
			enrollments: { where: { userId }, select: { id: true }, take: 1 },
		},
	});
	if (!set) return false;
	if (set.userId === userId || set.shared) return true;
	return set.enrollments.length > 0;
}

/** Follow a published set, or the caller's own legacy set. Keeps existing progress. */
export async function enrollInSet(userId: string, setId: string): Promise<{ setId: string; srsActive: true }> {
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId },
		select: { id: true, userId: true, shared: true },
	});
	if (!set) throw new AppError('Bộ từ không tồn tại', 404);
	if (set.userId !== userId && !set.shared) {
		throw new AppError('Bộ từ chưa được xuất bản', 403);
	}
	await activateSetInSrs(userId, setId);
	return { setId, srsActive: true };
}

/** Unfollow. Word progress stays so a later follow resumes the same schedule. */
export async function unenrollFromSet(userId: string, setId: string): Promise<{ removed: boolean }> {
	const result = await prisma.cnSetEnrollment.deleteMany({ where: { userId, setId } });
	return { removed: result.count > 0 };
}

export async function setEnrollmentSrs(
	userId: string,
	setId: string,
	srsActive: boolean,
): Promise<{ setId: string; srsActive: boolean }> {
	const enrollment = await prisma.cnSetEnrollment.findUnique({
		where: { userId_setId: { userId, setId } },
		select: { id: true },
	});
	if (!enrollment) throw new AppError('Bạn chưa theo học bộ từ này', 404);
	if (srsActive) await activateSetInSrs(userId, setId);
	else await deactivateSetFromSrs(userId, setId);
	return { setId, srsActive };
}

/**
 * After an admin adds words to a published set, create progress for every
 * follower who is still reviewing that set. Existing rows are left alone.
 */
export async function enrollNewWordsForActiveFollowers(setId: string, wordIds: string[]): Promise<number> {
	const unique = [...new Set(wordIds)];
	if (!unique.length) return 0;
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId },
		select: { shared: true },
	});
	if (!set?.shared) return 0;
	const followers = await prisma.cnSetEnrollment.findMany({
		where: { setId, srsActive: true },
		select: { userId: true },
	});
	await Promise.all(followers.map((row) => enrollWordsInSrs(row.userId, unique)));
	return followers.length;
}

export async function listEnrolledSets(userId: string): Promise<CnWordSetListItemDTO[]> {
	const enrollments = await prisma.cnSetEnrollment.findMany({
		where: { userId },
		include: {
			set: { include: { items: true } },
		},
	});
	const sets = enrollments
		.map((enrollment) => ({ enrollment, set: enrollment.set }))
		.sort((a, b) => b.set.updatedAt.getTime() - a.set.updatedAt.getTime());

	const allWordIds = [...new Set(sets.flatMap(({ set }) =>
		set.items.map((item) => item.wordId).filter((id): id is string => !!id),
	))];
	const now = new Date();
	const activeWordIds = [...new Set(sets
		.filter(({ enrollment }) => enrollment.srsActive)
		.flatMap(({ set }) => set.items.map((item) => item.wordId).filter((id): id is string => !!id)))];

	const [candidates, allProgress, wordsWithFillExamples] = allWordIds.length
		? await Promise.all([
			activeWordIds.length
				? fetchProgressDueCandidates(userId, activeWordIds, now)
				: Promise.resolve([]),
			prisma.cnWordProgress.findMany({
				where: { userId, wordId: { in: allWordIds } },
				select: LEVEL_SELECT,
			}),
			loadWordIdsWithFillExamples(allWordIds, userId),
		])
		: [[], [], new Set<string>()] as const;

	const dueCountByWordId = new Map<string, number>();
	for (const progress of candidates) {
		dueCountByWordId.set(
			progress.wordId,
			countDueChannelsForProgressList([progress], now, wordsWithFillExamples),
		);
	}

	return sets.map(({ enrollment, set }) => {
		const wordIds = [...new Set(set.items.map((item) => item.wordId).filter((id): id is string => !!id))];
		const buckets = bucketWordProgress(
			wordIds,
			set.items.length,
			allProgress as ProgressBucketRow[],
			wordsWithFillExamples,
		);
		const dueCount = enrollment.srsActive
			? wordIds.reduce((sum, wordId) => sum + (dueCountByWordId.get(wordId) ?? 0), 0)
			: 0;
		const weakCount = enrollment.srsActive
			? allProgress.filter((row) => wordIds.includes(row.wordId) && (row.state === 'weak' || row.state === 'learning')).length
			: 0;
		return {
			id: set.id,
			title: set.title,
			description: set.description,
			source: set.source,
			srsActive: enrollment.srsActive,
			shared: set.shared,
			level: set.level,
			legacy: set.userId === userId && !set.shared,
			enrolled: true,
			learnerCount: 0,
			itemCount: set.items.length,
			dueCount,
			weakCount,
			introducedCount: buckets.introducedCount,
			masteredCount: buckets.masteredCount,
			newCount: buckets.newCount,
			learningCount: buckets.learningCount,
			createdAt: set.createdAt.toISOString(),
			updatedAt: set.updatedAt.toISOString(),
		};
	});
}

export async function listExploreSets(
	userId: string,
	query: { q?: string; level?: number } = {},
): Promise<ExploreSetCard[]> {
	const q = query.q?.trim();
	const sets = await prisma.cnWordSet.findMany({
		where: {
			shared: true,
			...(query.level ? { level: query.level } : {}),
			...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
		},
		include: {
			items: {
				where: { wordId: { not: null } },
				orderBy: { rawTerm: 'asc' },
				take: 3,
				include: { word: { select: { simplified: true } } },
			},
			enrollments: { where: { userId }, select: { id: true }, take: 1 },
			_count: { select: { items: true } },
		},
		orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
	});

	return sets.map((set) => ({
		id: set.id,
		title: set.title,
		description: set.description,
		level: set.level,
		itemCount: set._count.items,
		sampleWords: set.items.map((item) => item.word?.simplified).filter((term): term is string => !!term),
		enrolled: set.enrollments.length > 0,
		starter: set.description === GLOBAL_SAMPLE_SET_DESCRIPTION,
		updatedAt: set.updatedAt.toISOString(),
	}));
}
