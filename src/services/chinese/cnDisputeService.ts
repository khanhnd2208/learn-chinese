import { prisma } from '@/lib/prisma';
import { CN_DISPUTES_PER_DAY } from '@/config/constants';
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
