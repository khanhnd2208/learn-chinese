import { prisma } from '@/lib/prisma';
import { questionChannel } from '@/lib/chinese/coreQuestionTypes';
import type { CnPracticeSubmitItem } from '@/types/chinese';

const ANSWER_LOG_MAX_CHARS = 200;

/** exampleId → wordId, only for canonical examples and this learner's own examples. */
export async function loadVisibleExampleWordIds(
	userId: string,
	exampleIds: string[],
): Promise<Map<string, string>> {
	const ids = [...new Set(exampleIds.filter((id) => id.length > 0))];
	if (!ids.length) return new Map();
	const rows = await prisma.cnExample.findMany({
		where: {
			id: { in: ids },
			OR: [{ ownerUserId: null }, { ownerUserId: userId }],
		},
		select: { id: true, wordId: true },
	});
	return new Map(rows.map((row) => [row.id, row.wordId]));
}

export function loggedExampleId(
	item: CnPracticeSubmitItem,
	exampleWordIds: Map<string, string>,
): string | null {
	if (questionChannel(item.questionType) !== 'sentence' || !item.exampleId) return null;
	if (exampleWordIds.get(item.exampleId) !== item.wordId) return null;
	return item.exampleId;
}

export function loggedSentenceAnswer(item: CnPracticeSubmitItem): string | null {
	if (questionChannel(item.questionType) !== 'sentence' || !item.answer) return null;
	return item.answer.slice(0, ANSWER_LOG_MAX_CHARS);
}

export function loggedAttempts(item: CnPracticeSubmitItem): number | null {
	return item.attempts === 1 || item.attempts === 2 ? item.attempts : null;
}
