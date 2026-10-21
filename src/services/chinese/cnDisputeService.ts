import { prisma } from '@/lib/prisma';
import { CN_DISPUTES_PER_DAY } from '@/config/constants';
import { AppError } from '@/lib/appError';
import { normalizeGradedText } from '@/lib/chinese/answerGrade';
import { questionChannel } from '@/lib/chinese/coreQuestionTypes';
import { addLocalDays, startOfLocalDay } from '@/lib/chinese/reviewMetrics';
import { loadVisibleExampleWordIds } from '@/services/chinese/cnAnswerLogContext';
import type { CnPracticeSubmitItem } from '@/types/chinese';

function localDayRange(now: Date): { start: Date; end: Date } {
	const start = startOfLocalDay(now);
	return { start, end: addLocalDays(start, 1) };
}

function disputeAnswer(item: CnPracticeSubmitItem): string {
	return item.answer?.trim().slice(0, 200) ?? '';
}

/**
 * File disputes that meet the rules and return the client answer ids that should
 * be treated as a hinted-correct result. Over the daily cap, the flag is ignored.
 */
export async function resolveDisputedItems(
	userId: string,
	items: CnPracticeSubmitItem[],
	now = new Date(),
): Promise<Set<string>> {
	const exampleWordIds = await loadVisibleExampleWordIds(
		userId,
		items.flatMap((item) => item.exampleId ? [item.exampleId] : []),
	);
	const candidates = items.filter((item) => {
		if (item.disputed !== true || item.correct !== false) return false;
		if (questionChannel(item.questionType) !== 'sentence') return false;
		if (!item.clientAnswerId || !disputeAnswer(item)) return false;
		return exampleWordIds.get(item.exampleId ?? '') === item.wordId;
	});
	if (!candidates.length) return new Set();

	const { start, end } = localDayRange(now);
	const usedToday = await prisma.cnExampleDispute.count({
		where: { userId, createdAt: { gte: start, lt: end } },
	});
	const allowed = candidates.slice(0, Math.max(0, CN_DISPUTES_PER_DAY - usedToday));
	if (!allowed.length) return new Set();

	await prisma.cnExampleDispute.createMany({
		data: allowed.map((item) => ({
			exampleId: item.exampleId!,
			wordId: item.wordId,
			userId,
			answer: disputeAnswer(item),
			clientAnswerId: item.clientAnswerId,
			status: 'pending',
		})),
		skipDuplicates: true,
	});
	return new Set(allowed.map((item) => item.clientAnswerId!));
}

export interface PendingDisputeRow {
	exampleId: string;
	answer: string;
	userId: string;
	createdAt: Date;
	example: {
		hanzi: string;
		meaningVi: string;
		word: { simplified: string; meaningVi: string };
	};
}

export interface PendingDisputeGroup {
	exampleId: string;
	answer: string;
	hanzi: string;
	meaningVi: string;
	targetWord: string;
	targetMeaningVi: string;
	userCount: number;
	latestAt: string;
}

export function groupPendingDisputes(rows: PendingDisputeRow[]): PendingDisputeGroup[] {
	const groups = new Map<string, PendingDisputeGroup & { users: Set<string>; latest: Date }>();
	for (const row of rows) {
		const key = `${row.exampleId}\n${row.answer}`;
		const current = groups.get(key);
		if (!current) {
			groups.set(key, {
				exampleId: row.exampleId,
				answer: row.answer,
				hanzi: row.example.hanzi,
				meaningVi: row.example.meaningVi,
				targetWord: row.example.word.simplified,
				targetMeaningVi: row.example.word.meaningVi,
				userCount: 0,
				latestAt: row.createdAt.toISOString(),
				users: new Set([row.userId]),
				latest: row.createdAt,
			});
			continue;
		}
		current.users.add(row.userId);
		if (row.createdAt > current.latest) {
			current.latest = row.createdAt;
			current.latestAt = row.createdAt.toISOString();
		}
	}
	return [...groups.values()]
		.map((group) => ({
			exampleId: group.exampleId,
			answer: group.answer,
			hanzi: group.hanzi,
			meaningVi: group.meaningVi,
			targetWord: group.targetWord,
			targetMeaningVi: group.targetMeaningVi,
			userCount: group.users.size,
			latestAt: group.latestAt,
		}))
		.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export async function listPendingDisputeGroups(page = 1, pageSize = 50): Promise<PendingDisputeGroup[]> {
	const rows = await prisma.cnExampleDispute.findMany({
		where: { status: 'pending' },
		orderBy: { createdAt: 'desc' },
		include: {
			example: {
				select: {
					hanzi: true,
					meaningVi: true,
					word: { select: { simplified: true, meaningVi: true } },
				},
			},
		},
	});
	const groups = groupPendingDisputes(rows);
	const start = (page - 1) * pageSize;
	return groups.slice(start, start + pageSize);
}

function withAcceptedAnswer(existing: string[], answer: string): string[] {
	const normalized = normalizeGradedText(answer);
	if (!normalized) return existing;
	if (existing.some((item) => normalizeGradedText(item) === normalized)) return existing;
	return [...existing, normalized];
}

export async function resolveDisputeGroup(
	adminId: string,
	exampleId: string,
	answer: string,
	action: 'accept' | 'reject',
	now = new Date(),
): Promise<{ updated: number; acceptedAnswers: string[] }> {
	const storedAnswer = answer.trim();
	if (!storedAnswer) throw new AppError('Thiếu đáp án', 400);
	if (action === 'reject') {
		const result = await prisma.cnExampleDispute.updateMany({
			where: { exampleId, answer: storedAnswer, status: 'pending' },
			data: { status: 'rejected', resolvedById: adminId, resolvedAt: now },
		});
		return { updated: result.count, acceptedAnswers: [] };
	}

	const example = await prisma.cnExample.findUnique({
		where: { id: exampleId },
		select: { acceptedAnswers: true },
	});
	if (!example) throw new AppError('Không tìm thấy câu', 404);
	const acceptedAnswers = withAcceptedAnswer(example.acceptedAnswers ?? [], storedAnswer);
	const [, updated] = await prisma.$transaction([
		prisma.cnExample.update({
			where: { id: exampleId },
			data: { acceptedAnswers },
			select: { id: true },
		}),
		prisma.cnExampleDispute.updateMany({
			where: { exampleId, answer: storedAnswer, status: 'pending' },
			data: { status: 'accepted', resolvedById: adminId, resolvedAt: now },
		}),
	]);
	return { updated: updated.count, acceptedAnswers };
}
