/* ════════════════════════════════════════════════════════════════════════
   cnPracticeService.ts — Practice session orchestration
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import {
	CHANNEL_TO_GROUP,
	type PracticeGroup,
	practiceModeToGroup,
} from '@/lib/chinese/practiceTaxonomy';
import { generatePracticeSession, mergeWordPools } from '@/lib/chinese/generateQuestions';
import { CN_DEFAULT_PRACTICE_COUNT, CN_DEFAULT_REVIEW_COUNT, CN_MAX_CHANNELS_PER_WORD_REVIEW } from '@/config/constants';
import { getWordCard, getUserDistractorPool } from '@/services/chinese/cnContentService';
import { getReviewSession, progressToDTO } from '@/services/chinese/cnSrsService';
import type {
	CnPracticeQuestionDTO,
	CnPracticeSessionResultDTO,
	CnQuestionType,
	CnWordCardDTO,
	CnWordProgressDTO,
} from '@/types/chinese';

export interface SetWordsResult {
	words: CnWordCardDTO[];
	progressMap: Map<string, CnWordProgressDTO | null>;
}

export async function getWordsForSet(userId: string, setId: string): Promise<SetWordsResult> {
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: { items: { where: { wordId: { not: null } } } },
	});
	if (!set) return { words: [], progressMap: new Map() };

	const wordIds = set.items.map((i) => i.wordId).filter((id): id is string => !!id);
	const [cards, progressRows] = await Promise.all([
		Promise.all(wordIds.map((id) => getWordCard(id, userId))),
		prisma.cnWordProgress.findMany({ where: { userId, wordId: { in: wordIds } } }),
	]);

	const progressMap = new Map<string, CnWordProgressDTO | null>();
	for (const id of wordIds) progressMap.set(id, null);
	for (const p of progressRows) progressMap.set(p.wordId, progressToDTO(p));

	return {
		words: cards.filter((c): c is NonNullable<typeof c> => !!c),
		progressMap,
	};
}

export async function buildPracticeSession(
	userId: string,
	setId: string,
	count = CN_DEFAULT_PRACTICE_COUNT,
	mode = 'smart_mixed',
	wordId?: string,
): Promise<CnPracticeQuestionDTO[]> {
	const group = practiceModeToGroup(mode);
	let { words, progressMap } = await getWordsForSet(userId, setId);
	if (wordId) {
		words = words.filter((w) => w.id === wordId);
		if (!words.length) return [];
	}
	const distractorPool = words.length >= 8
		? words
		: mergeWordPools(words, await getUserDistractorPool(userId));
	return generatePracticeSession(words, count, { group, progressMap, distractorPool });
}

export async function buildListeningSession(userId: string, setId: string, count = 10) {
	return buildPracticeSession(userId, setId, count, 'listening');
}

export async function buildSentenceSession(userId: string, setId: string, count = 10) {
	return buildPracticeSession(userId, setId, count, 'sentence_usage');
}

export async function buildReviewQuestions(
	userId: string,
	limit = CN_DEFAULT_REVIEW_COUNT,
	excludeQuestionIds: string[] = [],
): Promise<CnPracticeQuestionDTO[]> {
	const dueChannels = await getReviewSession(userId, limit * CN_MAX_CHANNELS_PER_WORD_REVIEW);
	const [cards, globalPool] = await Promise.all([
		Promise.all([...new Set(dueChannels.map((d) => d.progress.wordId))].map((id) => getWordCard(id, userId))),
		getUserDistractorPool(userId),
	]);
	const cardMap = new Map(cards.filter((c): c is NonNullable<typeof c> => !!c).map((c) => [c.id, c]));
	const distractorPool = mergeWordPools([...cardMap.values()], globalPool);

	const wordChannelCount = new Map<string, number>();
	const selected = dueChannels.filter((entry) => {
		const count = wordChannelCount.get(entry.progress.wordId) ?? 0;
		if (count >= CN_MAX_CHANNELS_PER_WORD_REVIEW) return false;
		wordChannelCount.set(entry.progress.wordId, count + 1);
		return true;
	}).slice(0, limit);

	const progressMap = new Map<string, CnWordProgressDTO | null>();
	for (const entry of selected) {
		progressMap.set(entry.progress.wordId, progressToDTO(entry.progress));
	}

	const questions: CnPracticeQuestionDTO[] = [];

	for (const entry of selected) {
		if (questions.length >= limit) break;
		const word = cardMap.get(entry.progress.wordId);
		if (!word) continue;

		const group = CHANNEL_TO_GROUP[entry.channel] as PracticeGroup;
		let batch = generatePracticeSession([word], 1, {
			group,
			progressMap,
			distractorPool,
			targetChannel: entry.channel,
		});
		if (!batch.length) {
			batch = generatePracticeSession([word], 1, {
				group: 'core_vocab',
				progressMap,
				distractorPool,
			});
		}
		questions.push(...batch);
	}

	const exclude = new Set(excludeQuestionIds);
	return questions.filter((q) => !exclude.has(q.id)).slice(0, limit);
}

export function summarizeSession(
	items: Array<{ questionType: CnQuestionType; correct: boolean; wordId: string }>,
): CnPracticeSessionResultDTO {
	const byType: Record<string, { correct: number; total: number }> = {};
	const wrongWords = new Set<string>();

	for (const item of items) {
		if (!byType[item.questionType]) byType[item.questionType] = { correct: 0, total: 0 };
		byType[item.questionType].total++;
		if (item.correct) byType[item.questionType].correct++;
		else wrongWords.add(item.wordId);
	}

	return {
		total: items.length,
		correct: items.filter((i) => i.correct).length,
		byType,
		weakWords: [...wrongWords],
	};
}
