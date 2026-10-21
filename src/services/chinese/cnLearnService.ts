/* ════════════════════════════════════════════════════════════════════════
   cnLearnService.ts — Daily new-word queue
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { CN_LEARN_BATCH_SIZE, CN_NEW_WORDS_PER_DAY } from '@/config/constants';
import { addLocalDays, startOfLocalDay } from '@/lib/chinese/reviewMetrics';
import { generateQuestionForWord } from '@/lib/chinese/generateQuestions';
import { getWordCardsForSrsPool } from '@/services/chinese/cnContentService';
import {
	ensureEnrollmentForActiveWords,
	resolveSrsPoolWordIds,
} from '@/services/chinese/cnSrsEnrollmentService';
import type { CnPracticeQuestionDTO, CnWordCardDTO } from '@/types/chinese';

export interface LearnQueue {
	words: CnWordCardDTO[];
	remainingToday: number;
	totalUnintroduced: number;
}

function localDayRange(now: Date): { start: Date; end: Date } {
	const start = startOfLocalDay(now);
	return { start, end: addLocalDays(start, 1) };
}

function nullsLast(value: number | null | undefined): number {
	return value == null ? Number.POSITIVE_INFINITY : value;
}

async function countIntroducedToday(userId: string, now: Date): Promise<number> {
	const { start, end } = localDayRange(now);
	return prisma.cnWordProgress.count({
		where: {
			userId,
			introducedAt: { gte: start, lt: end },
		},
	});
}

export async function getLearnQueue(
	userId: string,
	limit = CN_LEARN_BATCH_SIZE,
	now = new Date(),
): Promise<LearnQueue> {
	const pool = await resolveSrsPoolWordIds(userId);
	const poolIds = [...pool];
	await ensureEnrollmentForActiveWords(userId, poolIds);

	const [introducedToday, totalUnintroduced] = await Promise.all([
		countIntroducedToday(userId, now),
		poolIds.length
			? prisma.cnWordProgress.count({
				where: { userId, introducedAt: null, wordId: { in: poolIds } },
			})
			: Promise.resolve(0),
	]);
	const remainingToday = Math.max(0, CN_NEW_WORDS_PER_DAY - introducedToday);
	const take = Math.min(Math.max(0, limit), remainingToday);
	if (take === 0 || poolIds.length === 0) {
		return { words: [], remainingToday, totalUnintroduced };
	}

	const [items, rows] = await Promise.all([
		prisma.cnWordSetItem.findMany({
			where: { wordId: { in: poolIds }, set: { userId, srsActive: true } },
			select: { id: true, wordId: true },
			orderBy: { id: 'asc' },
		}),
		prisma.cnWordProgress.findMany({
			where: { userId, introducedAt: null, wordId: { in: poolIds } },
			select: {
				wordId: true,
				word: { select: { learningPriority: true, frequencyRank: true } },
			},
		}),
	]);

	const itemOrder = new Map<string, string>();
	for (const item of items) {
		if (item.wordId && !itemOrder.has(item.wordId)) itemOrder.set(item.wordId, item.id);
	}

	const ordered = [...rows].sort((a, b) => {
		const itemCmp = (itemOrder.get(a.wordId) ?? '\uffff').localeCompare(itemOrder.get(b.wordId) ?? '\uffff');
		if (itemCmp !== 0) return itemCmp;
		const priorityCmp = nullsLast(a.word.learningPriority) - nullsLast(b.word.learningPriority);
		if (priorityCmp !== 0) return priorityCmp;
		return nullsLast(a.word.frequencyRank) - nullsLast(b.word.frequencyRank);
	});
	const chosenIds = ordered.slice(0, take).map((row) => row.wordId);
	const cards = await getWordCardsForSrsPool(userId, chosenIds);
	const words = chosenIds.flatMap((id) => {
		const card = cards.get(id);
		if (!card) return [];
		return [{ ...card, examples: card.examples.slice(0, 1) }];
	});

	return { words, remainingToday, totalUnintroduced };
}

export async function markIntroduced(
	userId: string,
	wordIds: string[],
	now = new Date(),
): Promise<{ marked: number; remainingToday: number }> {
	const pool = await resolveSrsPoolWordIds(userId);
	await ensureEnrollmentForActiveWords(userId, [...pool]);
	const introducedToday = await countIntroducedToday(userId, now);
	const remainingToday = Math.max(0, CN_NEW_WORDS_PER_DAY - introducedToday);
	const requested = wordIds.filter((id) => pool.has(id));
	if (!requested.length || remainingToday === 0) {
		return { marked: 0, remainingToday };
	}

	const pending = await prisma.cnWordProgress.findMany({
		where: { userId, wordId: { in: requested }, introducedAt: null },
		select: { wordId: true },
	});
	const pendingIds = new Set(pending.map((row) => row.wordId));
	const toMark = requested.filter((id) => pendingIds.has(id)).slice(0, remainingToday);
	if (!toMark.length) return { marked: 0, remainingToday };

	const result = await prisma.cnWordProgress.updateMany({
		where: { userId, wordId: { in: toMark }, introducedAt: null },
		data: { introducedAt: now, meaningDueAt: now },
	});
	return {
		marked: result.count,
		remainingToday: Math.max(0, remainingToday - result.count),
	};
}

/** One meaning MCQ per word just introduced. Distractors come from the rest of the SRS pool. */
export async function getLearnQuiz(userId: string, wordIds: string[]): Promise<{ questions: CnPracticeQuestionDTO[] }> {
	const pool = await resolveSrsPoolWordIds(userId);
	const requested = [...new Set(wordIds.filter((id) => pool.has(id)))].slice(0, CN_LEARN_BATCH_SIZE);
	if (!requested.length) return { questions: [] };

	const extra = [...pool].filter((id) => !requested.includes(id)).slice(0, 30);
	const cards = await getWordCardsForSrsPool(userId, [...requested, ...extra]);
	const allWords = [...cards.values()];
	const questions = requested.flatMap((id, idx) => {
		const word = cards.get(id);
		if (!word) return [];
		const question = generateQuestionForWord(word, allWords, 'hanzi_to_meaning', idx);
		return question ? [question] : [];
	});
	return { questions };
}
