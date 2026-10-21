import { prisma } from '@/lib/prisma';
import { expectedAnswerFor, gradeAnswerText, gradeSentenceAnswer } from '@/lib/chinese/answerGrade';
import { questionChannel } from '@/lib/chinese/coreQuestionTypes';
import { loadWordViewsForUser } from '@/services/chinese/cnWordViewService';
import type { CnPracticeSubmitItem } from '@/types/chinese';

/** Skip answers this user already stored. The same id inside one request counts once. */
export async function dropDuplicateSubmitItems(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<CnPracticeSubmitItem[]> {
	const ids = items
		.map((item) => item.clientAnswerId)
		.filter((id): id is string => typeof id === 'string' && id.length > 0);
	const existing = ids.length
		? await prisma.cnAnswerLog.findMany({
			where: { userId, clientAnswerId: { in: ids } },
			select: { clientAnswerId: true },
		})
		: [];
	const seen = new Set(existing.map((row) => row.clientAnswerId).filter((id): id is string => !!id));
	const fresh: CnPracticeSubmitItem[] = [];
	for (const item of items) {
		if (item.clientAnswerId && seen.has(item.clientAnswerId)) continue;
		if (item.clientAnswerId) seen.add(item.clientAnswerId);
		fresh.push(item);
	}
	return fresh;
}

async function acceptedAnswersByExample(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<Map<string, string[]>> {
	const ids = [...new Set(items.flatMap((item) =>
		questionChannel(item.questionType) === 'sentence' && item.exampleId ? [item.exampleId] : [],
	))];
	if (!ids.length) return new Map();
	const rows = await prisma.cnExample.findMany({
		where: {
			id: { in: ids },
			OR: [{ ownerUserId: null }, { ownerUserId: userId }],
		},
		select: { id: true, wordId: true, acceptedAnswers: true },
	});
	return new Map(rows.map((row) => [`${row.wordId}:${row.id}`, row.acceptedAnswers ?? []]));
}

export async function reconcileSubmitItems(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<CnPracticeSubmitItem[]> {
	const [views, acceptedByExample] = await Promise.all([
		loadWordViewsForUser(userId, items.map((item) => item.wordId)),
		acceptedAnswersByExample(userId, items),
	]);
	return items.map((item) => {
		if (typeof item.answer !== 'string') {
			// TODO: remove this branch after 2026-11-04. Old open tabs omit the answer text.
			console.warn('submit item missing answer; trusting client correct once');
			return item;
		}
		const view = views.get(item.wordId);
		if (!view) {
			console.warn('submit item has no word view; trusting client correct once');
			return item;
		}
		const expected = expectedAnswerFor(item.questionType, view);
		const accepted = item.exampleId
			? acceptedByExample.get(`${item.wordId}:${item.exampleId}`) ?? []
			: [];
		const correct = questionChannel(item.questionType) === 'sentence'
			? gradeSentenceAnswer(expected, accepted, item.answer)
			: gradeAnswerText(item.questionType, expected, item.answer);
		if (correct !== item.correct) {
			console.warn(`server graded ${item.questionType} differently from the client`);
		}
		return { ...item, correct };
	});
}

export async function prepareSubmitItems(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<CnPracticeSubmitItem[]> {
	const fresh = await dropDuplicateSubmitItems(userId, items);
	return reconcileSubmitItems(userId, fresh);
}
