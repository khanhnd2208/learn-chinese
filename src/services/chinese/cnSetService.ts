/* ════════════════════════════════════════════════════════════════════════
   cnSetService.ts — User Chinese word sets
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { MAX_CN_TERMS_PER_SET } from '@/config/constants';
import { buildCoverageReport, lookupTerms } from '@/services/chinese/cnContentService';
import { canViewSet, enrollNewWordsForActiveFollowers } from '@/services/chinese/cnEnrollmentService';
import {
	activateSetInSrs,
	onSetDeleted,
	onWordRemovedFromActiveSet,
} from '@/services/chinese/cnSrsEnrollmentService';
import { countDueChannelsForProgressList, fetchProgressDueCandidates, loadWordIdsWithFillExamples } from '@/services/chinese/cnSrsService';
import { bucketWordProgress, type ProgressBucketRow } from '@/lib/chinese/masteryModel';
import { loadWordViewsForUser } from '@/services/chinese/cnWordViewService';
import { normalizeTerm, uniqueTerms } from '@/lib/chinese/hanziUtils';
import type {
	CnCoverageReportDTO,
	CnSharedWordSetDTO,
	CnWordSetDTO,
	CnWordSetListItemDTO,
	CreateCnWordSetInput,
} from '@/types/chinese';
import type { CnWord, CnWordSet, CnWordSetItem } from '@prisma/client';

function wordToBrief(w: CnWord) {
	return {
		id: w.id,
		simplified: w.simplified,
		pinyin: w.pinyin,
		hanViet: w.hanViet,
		meaningVi: w.meaningVi,
		partOfSpeech: w.partOfSpeech,
		mnemonicVi: w.mnemonicVi,
		ghiChu: w.ghiChu || undefined,
		hskLevel: w.hskLevel,
		status: w.status,
	};
}

const EMPTY_SET_STATS = {
	dueCount: 0,
	weakCount: 0,
	introducedCount: 0,
	masteredCount: 0,
	newCount: 0,
	learningCount: 0,
};

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

async function countDueAndWeak(
	userId: string,
	wordIds: string[],
	itemCount: number,
	srsActive: boolean,
) {
	if (!wordIds.length) return { ...EMPTY_SET_STATS, newCount: itemCount };
	const now = new Date();
	const [candidates, allProgress, wordsWithFillExamples] = await Promise.all([
		srsActive ? fetchProgressDueCandidates(userId, wordIds, now) : Promise.resolve([]),
		prisma.cnWordProgress.findMany({
			where: { userId, wordId: { in: wordIds } },
			select: LEVEL_SELECT,
		}),
		loadWordIdsWithFillExamples(wordIds, userId),
	]);
	const dueCount = srsActive
		? countDueChannelsForProgressList(candidates, now, wordsWithFillExamples)
		: 0;
	const weakCount = srsActive
		? allProgress.filter((p) => p.state === 'weak' || p.state === 'learning').length
		: 0;
	return {
		dueCount,
		weakCount,
		...bucketWordProgress(wordIds, itemCount, allProgress as ProgressBucketRow[], wordsWithFillExamples),
	};
}

async function countDueAndWeakForSets(
	userId: string,
	sets: Array<CnWordSet & { items: CnWordSetItem[] }>,
): Promise<Map<string, typeof EMPTY_SET_STATS>> {
	const statsBySetId = new Map<string, typeof EMPTY_SET_STATS>();
	for (const set of sets) {
		statsBySetId.set(set.id, { ...EMPTY_SET_STATS, newCount: set.items.length });
	}

	const allWordIds = [...new Set(sets.flatMap((set) =>
		set.items.map((item) => item.wordId).filter((id): id is string => !!id),
	))];
	if (!allWordIds.length) return statsBySetId;

	const activeWordIds = [...new Set(sets.filter((set) => set.srsActive).flatMap((set) =>
		set.items.map((item) => item.wordId).filter((id): id is string => !!id),
	))];
	const now = new Date();
	const [candidates, allProgress, wordsWithFillExamples] = await Promise.all([
		activeWordIds.length
			? fetchProgressDueCandidates(userId, activeWordIds, now)
			: Promise.resolve([]),
		prisma.cnWordProgress.findMany({
			where: { userId, wordId: { in: allWordIds } },
			select: LEVEL_SELECT,
		}),
		loadWordIdsWithFillExamples(allWordIds, userId),
	]);

	const dueCountByWordId = new Map<string, number>();
	for (const progress of candidates) {
		dueCountByWordId.set(
			progress.wordId,
			countDueChannelsForProgressList([progress], now, wordsWithFillExamples),
		);
	}
	const weakWordIds = new Set(
		allProgress
			.filter((p) => p.state === 'weak' || p.state === 'learning')
			.map((p) => p.wordId),
	);

	for (const set of sets) {
		const wordIds = [...new Set(set.items.map((item) => item.wordId).filter((id): id is string => !!id))];
		statsBySetId.set(set.id, {
			dueCount: set.srsActive
				? wordIds.reduce((sum, wordId) => sum + (dueCountByWordId.get(wordId) ?? 0), 0)
				: 0,
			weakCount: set.srsActive ? wordIds.filter((wordId) => weakWordIds.has(wordId)).length : 0,
			...bucketWordProgress(wordIds, set.items.length, allProgress as ProgressBucketRow[], wordsWithFillExamples),
		});
	}

	return statsBySetId;
}

function setToListItem(
	set: CnWordSet & { items: CnWordSetItem[] },
	stats: typeof EMPTY_SET_STATS,
	viewerId: string,
	extras: { enrolled: boolean; learnerCount: number },
): CnWordSetListItemDTO {
	return {
		id: set.id,
		title: set.title,
		description: set.description,
		source: set.source,
		srsActive: set.srsActive,
		shared: set.shared,
		level: set.level ?? null,
		legacy: set.userId === viewerId && !set.shared,
		enrolled: extras.enrolled,
		learnerCount: extras.learnerCount,
		itemCount: set.items.length,
		dueCount: stats.dueCount,
		weakCount: stats.weakCount,
		introducedCount: stats.introducedCount,
		masteredCount: stats.masteredCount,
		newCount: stats.newCount,
		learningCount: stats.learningCount,
		createdAt: set.createdAt.toISOString(),
		updatedAt: set.updatedAt.toISOString(),
	};
}

export async function listUserSetTitles(userId: string): Promise<Array<{ id: string; title: string }>> {
	return prisma.cnWordSet.findMany({
		where: { userId },
		select: { id: true, title: true },
		orderBy: { updatedAt: 'desc' },
	});
}

export async function listUserSets(userId: string): Promise<CnWordSetListItemDTO[]> {
	const sets = await prisma.cnWordSet.findMany({
		where: { userId },
		include: {
			items: true,
			enrollments: { select: { userId: true, srsActive: true } },
		},
		orderBy: { updatedAt: 'desc' },
	});

	const decorated = sets.map((set) => {
		const mine = set.enrollments.find((enrollment) => enrollment.userId === userId);
		return {
			...set,
			srsActive: mine?.srsActive ?? false,
			enrolled: !!mine,
			learnerCount: set.enrollments.filter((enrollment) => enrollment.userId !== set.userId).length,
		};
	});
	const statsBySetId = await countDueAndWeakForSets(userId, decorated);
	return decorated.map((set) => setToListItem(
		set,
		statsBySetId.get(set.id) ?? { ...EMPTY_SET_STATS, newCount: set.items.length },
		userId,
		{ enrolled: set.enrolled, learnerCount: set.learnerCount },
	));
}

async function mapSetDto(
	userId: string,
	set: CnWordSet & {
		items: Array<CnWordSetItem & { word: CnWord | null }>;
		enrollments?: Array<{ srsActive: boolean }>;
	},
): Promise<CnWordSetDTO> {
	const enrollment = set.enrollments?.[0];
	const srsActive = enrollment?.srsActive ?? false;
	const wordIds = set.items.map((i) => i.wordId).filter((id): id is string => !!id);
	const stats = await countDueAndWeak(userId, wordIds, set.items.length, srsActive);
	const [progressRows, views] = wordIds.length
		? await Promise.all([
			prisma.cnWordProgress.findMany({
				where: { userId, wordId: { in: wordIds } },
			}),
			loadWordViewsForUser(userId, wordIds),
		])
		: [[], new Map()] as const;
	const progressMap = new Map(progressRows.map((p) => [p.wordId, p]));

	return {
		id: set.id,
		title: set.title,
		description: set.description,
		source: set.source,
		srsActive,
		shared: set.shared,
		level: set.level ?? null,
		legacy: set.userId === userId && !set.shared,
		enrolled: !!enrollment,
		itemCount: set.items.length,
		dueCount: stats.dueCount,
		weakCount: stats.weakCount,
		introducedCount: stats.introducedCount,
		masteredCount: stats.masteredCount,
		newCount: stats.newCount,
		learningCount: stats.learningCount,
		createdAt: set.createdAt.toISOString(),
		updatedAt: set.updatedAt.toISOString(),
		items: set.items.map((item) => ({
			id: item.id,
			rawTerm: item.rawTerm,
			wordId: item.wordId,
			word: item.word ? wordToBrief({
				...item.word,
				...(views.get(item.word.id) ?? {}),
			}) : null,
			progressState: item.wordId ? (progressMap.get(item.wordId)?.state ?? 'new') : null,
		})),
	};
}

const SET_DETAIL_INCLUDE = {
	items: {
		include: { word: true },
		orderBy: { rawTerm: 'asc' as const },
	},
};

export async function getUserSet(userId: string, setId: string): Promise<CnWordSetDTO | null> {
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: {
			...SET_DETAIL_INCLUDE,
			enrollments: { where: { userId }, select: { srsActive: true } },
		},
	});
	if (!set) return null;
	return mapSetDto(userId, set);
}

/** Read-only study view: owner, published set, or an existing enrollment. */
export async function getViewableSet(userId: string, setId: string): Promise<CnWordSetDTO | null> {
	if (!(await canViewSet(userId, setId))) return null;
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId },
		include: {
			...SET_DETAIL_INCLUDE,
			enrollments: { where: { userId }, select: { srsActive: true } },
		},
	});
	if (!set) return null;
	return mapSetDto(userId, set);
}

export async function createUserSet(
	userId: string,
	input: CreateCnWordSetInput,
): Promise<{ set: CnWordSetDTO; coverage: CnCoverageReportDTO }> {
	const terms = uniqueTerms(input.terms);
	if (!terms.length) throw new Error('Cần ít nhất một từ');
	if (terms.length > MAX_CN_TERMS_PER_SET) throw new Error(`Không quá ${MAX_CN_TERMS_PER_SET} từ mỗi bộ`);

	const lookups = await lookupTerms(terms);
	const coverage = buildCoverageReport(lookups);
	const lookupMap = new Map(lookups.map((l) => [l.term, l]));

	const set = await prisma.cnWordSet.create({
		data: {
			userId,
			title: input.title.trim(),
			description: input.description?.trim() ?? '',
			source: input.source ?? 'manual',
			srsActive: false,
			items: {
				create: terms.map((term) => ({
					rawTerm: term,
					wordId: lookupMap.get(term)?.word?.id ?? null,
				})),
			},
		},
		include: { items: { include: { word: true } } },
	});

	if (input.srsActive) {
		await activateSetInSrs(userId, set.id);
	}

	const full = await getUserSet(userId, set.id);
	return { set: full!, coverage };
}

export async function updateUserSet(
	userId: string,
	setId: string,
	data: { title?: string; description?: string },
): Promise<CnWordSetDTO | null> {
	const existing = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!existing) return null;

	await prisma.cnWordSet.update({
		where: { id: setId },
		data: {
			...(data.title !== undefined && { title: data.title.trim() }),
			...(data.description !== undefined && { description: data.description.trim() }),
		},
	});
	return getUserSet(userId, setId);
}

export async function deleteUserSet(userId: string, setId: string): Promise<boolean> {
	const existing = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!existing) return false;
	await onSetDeleted(userId, setId);
	await prisma.cnWordSet.delete({ where: { id: setId } });
	return true;
}

export async function addTermsToSet(
	userId: string,
	setId: string,
	terms: string[],
): Promise<{ set: CnWordSetDTO; coverage: CnCoverageReportDTO; enrolledCount: number } | null> {
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: { items: { select: { rawTerm: true } } },
	});
	if (!set) return null;

	const normalized = uniqueTerms(terms);
	const existingTerms = new Set(set.items.map((item) => normalizeTerm(item.rawTerm)).filter(Boolean));
	const newTerms = normalized.filter((term) => !existingTerms.has(term));
	if (existingTerms.size + newTerms.length > MAX_CN_TERMS_PER_SET) {
		throw new AppError(`Không quá ${MAX_CN_TERMS_PER_SET} từ mỗi bộ`, 400);
	}
	const lookups = await lookupTerms(normalized);
	const coverage = buildCoverageReport(lookups);
	const lookupMap = new Map(lookups.map((l) => [l.term, l]));

	const newWordIds: string[] = [];
	await prisma.$transaction(
		normalized.map((term) => {
			const wordId = lookupMap.get(term)?.word?.id ?? null;
			if (wordId) newWordIds.push(wordId);
			return prisma.cnWordSetItem.upsert({
				where: { setId_rawTerm: { setId, rawTerm: term } },
				create: { setId, rawTerm: term, wordId },
				update: { wordId },
			});
		}),
	);

	const followerCount = await enrollNewWordsForActiveFollowers(setId, newWordIds);

	await prisma.cnWordSet.update({ where: { id: setId }, data: { updatedAt: new Date() } });
	const full = await getUserSet(userId, setId);
	return {
		set: full!,
		coverage,
		enrolledCount: followerCount > 0 ? newWordIds.length : 0,
	};
}

export async function removeItemFromSet(
	userId: string,
	setId: string,
	itemId: string,
): Promise<{ ok: boolean; purgedProgress: boolean }> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set) return { ok: false, purgedProgress: false };

	const item = await prisma.cnWordSetItem.findFirst({ where: { id: itemId, setId } });
	if (!item) return { ok: false, purgedProgress: false };

	await prisma.cnWordSetItem.deleteMany({ where: { id: itemId, setId } });

	let purgedProgress = false;
	if (item.wordId) {
		const purgedCount = await onWordRemovedFromActiveSet(userId, setId, item.wordId);
		purgedProgress = purgedCount > 0;
	}
	return { ok: true, purgedProgress };
}

export async function removeItemsFromSet(
	userId: string,
	setId: string,
	itemIds: string[],
): Promise<{ ok: boolean; removedCount: number; purgedProgressCount: number }> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set) return { ok: false, removedCount: 0, purgedProgressCount: 0 };

	const items = await prisma.cnWordSetItem.findMany({
		where: { id: { in: itemIds }, setId },
		select: { id: true, wordId: true },
	});
	if (!items.length) return { ok: false, removedCount: 0, purgedProgressCount: 0 };

	await prisma.cnWordSetItem.deleteMany({
		where: { id: { in: items.map((i) => i.id) }, setId },
	});

	let purgedProgressCount = 0;
	for (const item of items) {
		if (!item.wordId) continue;
		const purged = await onWordRemovedFromActiveSet(userId, setId, item.wordId);
		if (purged > 0) purgedProgressCount += 1;
	}

	return { ok: true, removedCount: items.length, purgedProgressCount };
}

export interface ResolveSetItemWordInput {
	pinyin: string;
	meaningVi: string;
	hanViet?: string;
	partOfSpeech?: string;
	ghiChu?: string;
	mnemonicVi?: string;
}

export async function resolveSetItemWithWordData(
	userId: string,
	setId: string,
	itemId: string,
	fields: ResolveSetItemWordInput,
): Promise<CnWordSetDTO | null> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set) return null;

	const item = await prisma.cnWordSetItem.findFirst({ where: { id: itemId, setId } });
	if (!item) return null;

	const simplified = normalizeTerm(item.rawTerm);
	if (!simplified) return null;
	if (!fields.pinyin.trim() || !fields.meaningVi.trim()) {
		throw new Error('Pinyin và nghĩa tiếng Việt là bắt buộc');
	}

	const wordData = {
		pinyin: fields.pinyin.trim(),
		meaningVi: fields.meaningVi.trim(),
		hanViet: fields.hanViet?.trim() ?? '',
		partOfSpeech: fields.partOfSpeech?.trim() ?? '',
		ghiChu: fields.ghiChu?.trim() ?? '',
		mnemonicVi: fields.mnemonicVi?.trim() ?? '',
	};
	// Admin only (the route enforces it). This writes the shared word.
	const word = await prisma.cnWord.upsert({
		where: { simplified },
		create: { simplified, ...wordData, status: 'published' },
		update: { ...wordData, status: 'published' },
	});

	await prisma.cnWordSetItem.update({
		where: { id: itemId },
		data: { wordId: word.id, rawTerm: simplified },
	});

	await enrollNewWordsForActiveFollowers(setId, [word.id]);

	await prisma.cnWordSet.update({ where: { id: setId }, data: { updatedAt: new Date() } });
	return getUserSet(userId, setId);
}

export async function moveItemToSet(
	userId: string,
	fromSetId: string,
	itemId: string,
	toSetId: string,
): Promise<boolean> {
	const [from, to, item] = await Promise.all([
		prisma.cnWordSet.findFirst({ where: { id: fromSetId, userId } }),
		prisma.cnWordSet.findFirst({ where: { id: toSetId, userId } }),
		prisma.cnWordSetItem.findFirst({ where: { id: itemId, setId: fromSetId } }),
	]);
	if (!from || !to || !item) return false;

	const rawTerm = normalizeTerm(item.rawTerm);
	const existing = await prisma.cnWordSetItem.findUnique({
		where: { setId_rawTerm: { setId: toSetId, rawTerm } },
	});
	if (existing) {
		await prisma.cnWordSetItem.delete({ where: { id: itemId } });
	} else {
		await prisma.cnWordSetItem.update({
			where: { id: itemId },
			data: { setId: toSetId },
		});
	}

	if (item.wordId) {
		await onWordRemovedFromActiveSet(userId, fromSetId, item.wordId);
		await enrollNewWordsForActiveFollowers(toSetId, [item.wordId]);
	}
	return true;
}

export async function duplicateUserSet(userId: string, setId: string): Promise<CnWordSetDTO | null> {
	const source = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: { items: true },
	});
	if (!source) return null;

	const copy = await prisma.cnWordSet.create({
		data: {
			userId,
			title: `${source.title} (bản sao)`,
			description: source.description,
			source: source.source,
			srsActive: false,
			items: {
				create: source.items.map((item) => ({
					rawTerm: item.rawTerm,
					wordId: item.wordId,
				})),
			},
		},
	});

	return getUserSet(userId, copy.id);
}

export async function listSharedSets(): Promise<CnSharedWordSetDTO[]> {
	const sets = await prisma.cnWordSet.findMany({
		where: { shared: true },
		include: { items: true },
		orderBy: { updatedAt: 'desc' },
	});

	return sets.map((set) => ({
		id: set.id,
		title: set.title,
		description: set.description,
		itemCount: set.items.length,
		updatedAt: set.updatedAt.toISOString(),
	}));
}

export async function setSharedStatus(
	userId: string,
	setId: string,
	shared: boolean,
): Promise<CnWordSetDTO | null> {
	const existing = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!existing) return null;

	await prisma.cnWordSet.update({
		where: { id: setId },
		data: {
			shared,
			publishedAt: shared ? (existing.publishedAt ?? new Date()) : null,
		},
	});

	if (shared) {
		const items = await prisma.cnWordSetItem.findMany({
			where: { setId, wordId: { not: null } },
			select: { wordId: true },
		});
		await enrollNewWordsForActiveFollowers(setId, items.map((item) => item.wordId!));
	}

	return getUserSet(userId, setId);
}

export async function duplicateSharedSet(userId: string, sourceSetId: string): Promise<CnWordSetDTO | null> {
	const source = await prisma.cnWordSet.findFirst({
		where: { id: sourceSetId, shared: true },
		include: { items: true },
	});
	if (!source) return null;

	const copy = await prisma.cnWordSet.create({
		data: {
			userId,
			title: `${source.title} (từ thư viện)`,
			description: source.description,
			source: source.source,
			srsActive: false,
			shared: false,
			items: {
				create: source.items.map((item) => ({
					rawTerm: item.rawTerm,
					wordId: item.wordId,
				})),
			},
		},
	});

	return getUserSet(userId, copy.id);
}

export async function previewTermsCoverage(terms: string[]): Promise<CnCoverageReportDTO> {
	const lookups = await lookupTerms(uniqueTerms(terms));
	return buildCoverageReport(lookups);
}

export async function createSetFromHsk(
	userId: string,
	level: number,
	title: string,
	srsActive?: boolean,
): Promise<{ set: CnWordSetDTO; coverage: CnCoverageReportDTO }> {
	const words = await prisma.cnWord.findMany({
		where: { hskLevel: level, status: 'published' },
		select: { simplified: true },
	});
	if (!words.length) throw new Error(`Chưa có từ HSK ${level} trong database`);
	return createUserSet(userId, {
		title,
		source: 'hsk',
		terms: words.map((w) => w.simplified),
		srsActive,
	});
}
