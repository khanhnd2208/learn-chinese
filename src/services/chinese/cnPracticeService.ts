/* ════════════════════════════════════════════════════════════════════════
   cnPracticeService.ts — Practice session orchestration
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { practiceModeToGroup, resolvePracticeSessionMode } from '@/lib/chinese/practiceTaxonomy';
import {
	generatePracticeSession,
	generateReviewQuestion,
	mergeWordPools,
} from '@/lib/chinese/generateQuestions';
import { CN_DEFAULT_PRACTICE_COUNT, CN_DEFAULT_REVIEW_COUNT, CN_MAX_CHANNELS_PER_WORD_REVIEW } from '@/config/constants';
import { wordSupportsFillSentence } from '@/lib/chinese/verifiedExample';
import { getWordCardsByIds, getUserDistractorPool } from '@/services/chinese/cnContentService';
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
	const cardMap = await getWordCardsByIds(wordIds, userId);

	const progressMap = new Map<string, CnWordProgressDTO | null>();
	for (const id of wordIds) progressMap.set(id, cardMap.get(id)?.progress ?? null);

	return {
		words: wordIds
			.map((id) => cardMap.get(id))
			.filter((c): c is CnWordCardDTO => !!c),
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
	const sessionMode = resolvePracticeSessionMode(mode);
	const group = practiceModeToGroup(mode);
	const { words: setWords, progressMap } = await getWordsForSet(userId, setId);
	let words = setWords;
	if (wordId) {
		words = words.filter((w) => w.id === wordId);
		if (!words.length) return [];
	}
	const distractorPool = words.length >= 8
		? words
		: mergeWordPools(words, await getUserDistractorPool(userId));

	if (sessionMode.targetChannel === 'sentence') {
		words = words.filter((word) => wordSupportsFillSentence(word));
		if (!words.length) return [];
	}

	return generatePracticeSession(words, count, {
		group,
		targetChannel: sessionMode.targetChannel,
		fixedIntervalIdx: sessionMode.fixedIntervalIdx,
		practiceFormat: sessionMode.practiceFormat,
		progressMap,
		distractorPool,
	});
}

export async function buildSoundSession(userId: string, setId: string, count = 10) {
	return buildPracticeSession(userId, setId, count, 'sound');
}

/** @deprecated Use buildSoundSession */
export async function buildListeningSession(userId: string, setId: string, count = 10) {
	return buildSoundSession(userId, setId, count);
}

export interface ReviewQuestionsResult {
	questions: CnPracticeQuestionDTO[];
	skippedUnpublished: number;
}

/** Spread entries so the same wordId does not appear within minGap positions. */
export function spreadByWordId<T extends { progress: { wordId: string } }>(
	entries: T[],
	minGap = 3,
): T[] {
	const result: T[] = [];
	const deferred = [...entries];

	while (deferred.length > 0) {
		let placed = false;
		for (let i = 0; i < deferred.length; i++) {
			const wordId = deferred[i].progress.wordId;
			const recentWindow = result.slice(-minGap);
			if (!recentWindow.some((r) => r.progress.wordId === wordId)) {
				result.push(deferred.splice(i, 1)[0]);
				placed = true;
				break;
			}
		}
		if (!placed) {
			result.push(deferred.shift()!);
		}
	}
	return result;
}

export async function buildReviewQuestions(
	userId: string,
	limit = CN_DEFAULT_REVIEW_COUNT,
	excludeQuestionIds: string[] = [],
	excludeWordChannels: string[] = [],
): Promise<ReviewQuestionsResult> {
	const dueChannels = await getReviewSession(userId, limit * CN_MAX_CHANNELS_PER_WORD_REVIEW);
	const excludeWordChannelSet = new Set(excludeWordChannels);
	const dueWordIds = [...new Set(dueChannels.map((d) => d.progress.wordId))];
	const [cardMap, globalPool] = await Promise.all([
		getWordCardsByIds(dueWordIds, userId),
		getUserDistractorPool(userId),
	]);
	const skippedUnpublished = dueWordIds.filter((id) => !cardMap.has(id)).length;
	const distractorPool = mergeWordPools([...cardMap.values()], globalPool);

	const wordChannelCount = new Map<string, number>();
	const capped = dueChannels.filter((entry) => {
		const wordChannelKey = `${entry.progress.wordId}:${entry.channel}`;
		if (excludeWordChannelSet.has(wordChannelKey)) return false;
		const count = wordChannelCount.get(entry.progress.wordId) ?? 0;
		if (count >= CN_MAX_CHANNELS_PER_WORD_REVIEW) return false;
		wordChannelCount.set(entry.progress.wordId, count + 1);
		return true;
	});
	const selected = spreadByWordId(capped).slice(0, limit);

	const questions: CnPracticeQuestionDTO[] = [];

	for (const entry of selected) {
		if (questions.length >= limit) break;
		const word = cardMap.get(entry.progress.wordId);
		if (!word) continue;

		const progress = progressToDTO(entry.progress);
		const q = generateReviewQuestion(
			word,
			distractorPool,
			entry.channel,
			progress,
			questions.length,
		);
		if (q) {
			questions.push(q);
			continue;
		}

		// Fallback: MCQ meaning if typed generation fails
		const fallback = generateReviewQuestion(
			word,
			distractorPool,
			'meaning',
			{ ...progress, meaningIntervalIdx: 0 },
			questions.length,
		);
		if (fallback) questions.push(fallback);
	}

	const exclude = new Set(excludeQuestionIds);
	return {
		questions: questions.filter((q) => !exclude.has(q.id)).slice(0, limit),
		skippedUnpublished,
	};
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
