import { prisma } from '@/lib/prisma';
import { expectedAnswerFor, gradeAnswerText } from '@/lib/chinese/answerGrade';
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

export async function reconcileSubmitItems(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<CnPracticeSubmitItem[]> {
	const views = await loadWordViewsForUser(userId, items.map((item) => item.wordId));
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
		const correct = gradeAnswerText(item.questionType, expected, item.answer);
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
