/* ════════════════════════════════════════════════════════════════════════
   cnInfernoService.ts — Địa Ngục challenge mode
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import {
	ALL_SKILL_CHANNELS,
	type SkillChannel,
} from '@/lib/chinese/coreQuestionTypes';
import {
	generateInfernoQuestion,
	mergeWordPools,
	type InfernoWordChannel,
} from '@/lib/chinese/generateQuestions';
import { isTypedQuestion } from '@/lib/chinese/questionLabels';
import { wordSupportsQuestionType } from '@/lib/chinese/practiceTaxonomy';
import {
	CN_INFERNO_PREFETCH_SIZE,
	INFERNO_FILL_CORRECT,
	INFERNO_MASTERY_THRESHOLD,
	INFERNO_MCQ_CORRECT,
	INFERNO_WRONG_FLAT,
	INFERNO_WRONG_PCT,
} from '@/config/constants';
import { getWordCardsForSrsPool, getUserDistractorPool } from '@/services/chinese/cnContentService';
import { loadWordViewsForUser } from '@/services/chinese/cnWordViewService';
import { prepareSubmitItems } from '@/lib/chinese/answerGrading';
import {
	loadVisibleExampleWordIds,
	loggedAttempts,
	loggedExampleId,
	loggedSentenceAnswer,
} from '@/services/chinese/cnAnswerLogContext';
import {
	ensureEnrollmentForActiveWords,
	resolveSrsPoolWordIds,
} from '@/services/chinese/cnSrsEnrollmentService';
import { progressToDTO } from '@/services/chinese/cnSrsService';
import type {
	CnInfernoMasteryDeltaDTO,
	CnInfernoStatsDTO,
	CnInfernoWordRankDTO,
	CnPracticeQuestionDTO,
	CnPracticeSubmitItem,
	CnQuestionType,
	CnWordCardDTO,
	CnWordProgressDTO,
} from '@/types/chinese';

const INFERNO_TYPES_BY_CHANNEL: Record<SkillChannel, CnQuestionType[]> = {
	meaning: ['hanzi_to_meaning', 'meaning_to_hanzi', 'meaning_to_hanzi_typed'],
	sound: ['sound_to_hanzi', 'sound_to_hanzi_typed'],
	sentence: ['fill_sentence', 'fill_sentence_typed'],
};

const INFERNO_HIGH_RATIO = 0.3;
const INFERNO_LOW_BATCH_SLOTS = 4;
const INFERNO_HIGH_BATCH_SLOTS = 1;

export interface InfernoWordScore {
	wordId: string;
	masteryScore: number;
	wrongCount: number;
}

function channelSupportsInferno(word: CnWordCardDTO, channel: SkillChannel): boolean {
	return INFERNO_TYPES_BY_CHANNEL[channel].some((type) => wordSupportsQuestionType(word, type));
}

function shuffleArray<T>(arr: T[], rng: () => number = Math.random): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

/** All SRS-enrolled word × channel pairs that can generate an inferno question */
export function buildInfernoWordChannels(
	wordIds: string[],
	cardMap: Map<string, CnWordCardDTO>,
): InfernoWordChannel[] {
	const pairs: InfernoWordChannel[] = [];

	for (const wordId of wordIds) {
		const word = cardMap.get(wordId);
		if (!word) continue;
		for (const channel of ALL_SKILL_CHANNELS) {
			if (channelSupportsInferno(word, channel)) {
				pairs.push({ wordId, channel });
			}
		}
	}

	return pairs;
}

function eligibleChannelsForWord(
	word: CnWordCardDTO,
): SkillChannel[] {
	return ALL_SKILL_CHANNELS.filter((ch) => channelSupportsInferno(word, ch));
}

export function calcWrongPenalty(score: number): number {
	return INFERNO_WRONG_FLAT + Math.round(score * INFERNO_WRONG_PCT);
}

function infernoScoreDelta(
	questionType: CnQuestionType,
	correct: boolean,
	currentScore: number,
): number {
	if (!correct) return -calcWrongPenalty(currentScore);
	return isTypedQuestion(questionType) ? INFERNO_FILL_CORRECT : INFERNO_MCQ_CORRECT;
}

function applyScoreFloor(score: number, delta: number): number {
	return Math.max(0, score + delta);
}

/** Rank enrolled words: masteryScore DESC, wrongCount ASC, random tiebreak */
export function rankInfernoWords(
	wordIds: string[],
	scoreMap: Map<string, { masteryScore: number; wrongCount: number }>,
	rng: () => number = Math.random,
): string[] {
	return [...wordIds].sort((a, b) => {
		const sa = scoreMap.get(a) ?? { masteryScore: 0, wrongCount: 0 };
		const sb = scoreMap.get(b) ?? { masteryScore: 0, wrongCount: 0 };
		if (sb.masteryScore !== sa.masteryScore) return sb.masteryScore - sa.masteryScore;
		if (sa.wrongCount !== sb.wrongCount) return sa.wrongCount - sb.wrongCount;
		return rng() - 0.5;
	});
}

/** Top 30% = high group, bottom 70% = low group */
export function splitHighLowGroups(ranked: string[]): { highGroup: string[]; lowGroup: string[] } {
	const n = ranked.length;
	if (n === 0) return { highGroup: [], lowGroup: [] };

	const highCount = Math.max(1, Math.floor(n * INFERNO_HIGH_RATIO));
	if (highCount >= n) {
		return { highGroup: [...ranked], lowGroup: [...ranked] };
	}

	return {
		highGroup: ranked.slice(0, highCount),
		lowGroup: ranked.slice(highCount),
	};
}

function pickLowWords(
	lowGroup: string[],
	recentWordIds: string[],
	count: number,
	rng: () => number = Math.random,
): string[] {
	if (lowGroup.length === 0 || count <= 0) return [];

	const tryAvoid = (avoid: string[]) => {
		const avoidSet = new Set(avoid);
		return lowGroup.filter((id) => !avoidSet.has(id));
	};

	let pool = tryAvoid(recentWordIds.slice(-20));
	if (pool.length < count && recentWordIds.length > 0) {
		pool = tryAvoid(recentWordIds.slice(-10));
	}
	if (pool.length < count) {
		pool = [...lowGroup];
	}

	return shuffleArray(pool, rng).slice(0, count);
}

function pickHighWord(
	highGroup: string[],
	recentWordIds: string[],
	rng: () => number = Math.random,
): string | null {
	if (highGroup.length === 0) return null;

	const avoid = new Set(recentWordIds.slice(-20));
	let pool = highGroup.filter((id) => !avoid.has(id));
	if (pool.length === 0 && recentWordIds.length > 0) {
		pool = highGroup.filter((id) => !new Set(recentWordIds.slice(-10)).has(id));
	}
	if (pool.length === 0) {
		pool = [...highGroup];
	}

	return shuffleArray(pool, rng)[0] ?? null;
}

/**
 * Pick word batch: 4 from bottom 70% (weak) + 1 from top 30% (strong).
 * Word-level only — channel chosen later per word.
 */
export function pickInfernoWordBatch(
	wordIds: string[],
	scoreMap: Map<string, { masteryScore: number; wrongCount: number }>,
	limit: number,
	recentWordIds: string[] = [],
	rng: () => number = Math.random,
): string[] {
	if (wordIds.length === 0) return [];

	const ranked = rankInfernoWords(wordIds, scoreMap, rng);
	const { highGroup, lowGroup } = splitHighLowGroups(ranked);

	const lowSlots = Math.min(INFERNO_LOW_BATCH_SLOTS, Math.max(0, limit - INFERNO_HIGH_BATCH_SLOTS));

	const picked: string[] = [];
	const used = new Set<string>();

	for (const id of pickLowWords(lowGroup, recentWordIds, lowSlots, rng)) {
		if (!used.has(id)) {
			picked.push(id);
			used.add(id);
		}
	}

	const highId = pickHighWord(highGroup, recentWordIds, rng);
	if (highId && picked.length < limit && !used.has(highId)) {
		picked.push(highId);
		used.add(highId);
	}

	if (picked.length < limit) {
		for (const id of shuffleArray(ranked, rng)) {
			if (picked.length >= limit) break;
			if (!used.has(id)) {
				picked.push(id);
				used.add(id);
			}
		}
	}

	return shuffleArray(picked, rng).slice(0, limit);
}

function pickChannelForWord(
	word: CnWordCardDTO,
	rng: () => number = Math.random,
): SkillChannel | null {
	const channels = eligibleChannelsForWord(word);
	if (!channels.length) return null;
	return channels[Math.floor(rng() * channels.length)];
}

export interface InfernoSessionResult {
	questions: CnPracticeQuestionDTO[];
	totalEnrolled: number;
	masteredCount: number;
	masteryByWordId: Record<string, number>;
	eligiblePairs: number;
}

export async function buildInfernoSession(
	userId: string,
	limit = CN_INFERNO_PREFETCH_SIZE,
	recentWordIds: string[] = [],
): Promise<InfernoSessionResult> {
	const activeWordIds = await resolveSrsPoolWordIds(userId);
	const wordIds = [...activeWordIds];
	await ensureEnrollmentForActiveWords(userId, wordIds);

	if (!wordIds.length) {
		return {
			questions: [],
			totalEnrolled: 0,
			masteredCount: 0,
			masteryByWordId: {},
			eligiblePairs: 0,
		};
	}

	const [cardMap, globalPool, progressRows, infernoRows] = await Promise.all([
		getWordCardsForSrsPool(userId, wordIds),
		getUserDistractorPool(userId),
		prisma.cnWordProgress.findMany({ where: { userId, wordId: { in: wordIds } } }),
		prisma.cnInfernoProgress.findMany({ where: { userId, wordId: { in: wordIds } } }),
	]);

	const publishedCards = [...cardMap.values()];
	const progressMap = new Map<string, CnWordProgressDTO | null>();
	for (const id of wordIds) progressMap.set(id, null);
	for (const p of progressRows) progressMap.set(p.wordId, progressToDTO(p));

	const masteryByWordId: Record<string, number> = {};
	const scoreMap = new Map<string, { masteryScore: number; wrongCount: number }>();
	for (const id of wordIds) {
		masteryByWordId[id] = 0;
		scoreMap.set(id, { masteryScore: 0, wrongCount: 0 });
	}
	for (const row of infernoRows) {
		masteryByWordId[row.wordId] = row.masteryScore;
		scoreMap.set(row.wordId, {
			masteryScore: row.masteryScore,
			wrongCount: row.wrongCount,
		});
	}

	const masteredCount = Object.values(masteryByWordId).filter(
		(s) => s >= INFERNO_MASTERY_THRESHOLD,
	).length;

	const eligiblePairs = buildInfernoWordChannels(wordIds, cardMap);
	const eligibleWordIds = [...new Set(eligiblePairs.map((p) => p.wordId))];

	if (!eligibleWordIds.length) {
		return {
			questions: [],
			totalEnrolled: wordIds.length,
			masteredCount,
			masteryByWordId,
			eligiblePairs: 0,
		};
	}

	const distractorPool = mergeWordPools(publishedCards, globalPool);
	const questions: CnPracticeQuestionDTO[] = [];
	const maxAttempts = limit * Math.max(1, eligibleWordIds.length) * 4;

	for (let attempt = 0; attempt < maxAttempts && questions.length < limit; attempt++) {
		const batchWordIds = pickInfernoWordBatch(
			eligibleWordIds,
			scoreMap,
			limit - questions.length,
			recentWordIds,
		);
		if (!batchWordIds.length) break;

		for (const wordId of batchWordIds) {
			if (questions.length >= limit) break;

			const word = cardMap.get(wordId);
			if (!word) continue;

			const channel = pickChannelForWord(word);
			if (!channel) continue;

			const progress = progressMap.get(wordId) ?? null;
			const q = generateInfernoQuestion(
				word,
				distractorPool,
				channel,
				progress,
				questions.length,
			);
			if (!q) continue;
			questions.push(q);
		}
	}

	return {
		questions: shuffleArray(questions),
		totalEnrolled: wordIds.length,
		masteredCount,
		masteryByWordId,
		eligiblePairs: eligiblePairs.length,
	};
}

export async function submitInfernoResults(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<{ updated: number; masteryDeltas: CnInfernoMasteryDeltaDTO[] }> {
	const masteryDeltas: CnInfernoMasteryDeltaDTO[] = [];
	const now = new Date();
	const fresh = await prepareSubmitItems(userId, items);
	const exampleWordIds = await loadVisibleExampleWordIds(
		userId,
		fresh.flatMap((item) => item.exampleId ? [item.exampleId] : []),
	);

	for (const item of fresh) {
		const existing = await prisma.cnInfernoProgress.findUnique({
			where: { userId_wordId: { userId, wordId: item.wordId } },
		});
		const prevScore = existing?.masteryScore ?? 0;
		const delta = infernoScoreDelta(item.questionType, item.correct, prevScore);
		const newScore = applyScoreFloor(prevScore, delta);

		await prisma.cnInfernoProgress.upsert({
			where: { userId_wordId: { userId, wordId: item.wordId } },
			create: {
				userId,
				wordId: item.wordId,
				masteryScore: newScore,
				correctMcq: !isTypedQuestion(item.questionType) && item.correct ? 1 : 0,
				correctFill: isTypedQuestion(item.questionType) && item.correct ? 1 : 0,
				wrongCount: item.correct ? 0 : 1,
				lastAnsweredAt: now,
			},
			update: {
				masteryScore: newScore,
				correctMcq: {
					increment: !isTypedQuestion(item.questionType) && item.correct ? 1 : 0,
				},
				correctFill: {
					increment: isTypedQuestion(item.questionType) && item.correct ? 1 : 0,
				},
				wrongCount: item.correct ? 0 : { increment: 1 },
				lastAnsweredAt: now,
			},
		});

		await prisma.cnAnswerLog.create({
			data: {
				userId,
				wordId: item.wordId,
				questionType: item.questionType,
				correct: item.correct,
				source: 'inferno',
				clientAnswerId: item.clientAnswerId ?? null,
				exampleId: loggedExampleId(item, exampleWordIds),
				answer: loggedSentenceAnswer(item),
				hintUsed: item.hintUsed === true,
				responseMs: item.responseMs ?? null,
				attempts: loggedAttempts(item),
			},
		});

		masteryDeltas.push({
			wordId: item.wordId,
			delta: newScore - prevScore,
			newScore,
		});
	}

	return { updated: fresh.length, masteryDeltas };
}

function scoreBucketLabel(score: number): string {
	if (score <= 0) return '0';
	if (score < 100) return '1–99';
	if (score < 200) return '100–199';
	if (score < INFERNO_MASTERY_THRESHOLD) return '200–299';
	return '≥300';
}

function buildInfernoInsights(stats: Omit<CnInfernoStatsDTO, 'insights'>): string[] {
	const insights: string[] = [];

	if (stats.totalEnrolled === 0) {
		insights.push('Bật Ôn SRS trên bộ từ để bắt đầu chế độ Địa Ngục.');
		return insights;
	}

	if (stats.masteredCount > 0) {
		insights.push(
			`${stats.masteredCount}/${stats.totalEnrolled} từ đạt ≥300 điểm trong Địa Ngục.`,
		);
	}

	if (stats.stuckAtZero.length > 0) {
		insights.push(
			`${stats.stuckAtZero.length} từ đang bị kéo về 0 — tập trung ôn lại những từ này.`,
		);
	}

	if (stats.fillTotal > 0 && stats.mcqTotal > 0) {
		const fillBetter = stats.fillAccuracy > stats.mcqAccuracy;
		insights.push(
			fillBetter
				? `Bạn giỏi câu điền hơn MCQ (${stats.fillAccuracy}% vs ${stats.mcqAccuracy}%).`
				: `MCQ vẫn ổn định hơn câu điền (${stats.mcqAccuracy}% vs ${stats.fillAccuracy}%).`,
		);
	}

	if (stats.avgMasteryScore >= INFERNO_MASTERY_THRESHOLD) {
		insights.push('Điểm trung bình đã vượt 300 — tiếp tục duy trì!');
	}

	return insights.slice(0, 4);
}

export async function getInfernoStats(userId: string): Promise<CnInfernoStatsDTO> {
	const activeWordIds = await resolveSrsPoolWordIds(userId);
	const wordIds = [...activeWordIds];

	const [infernoRows, views] = await Promise.all([
		prisma.cnInfernoProgress.findMany({
			where: { userId, wordId: { in: wordIds } },
			include: { word: { select: { simplified: true, meaningVi: true } } },
		}),
		loadWordViewsForUser(userId, wordIds),
	]);

	const publishedCount = wordIds.length;
	const bucketCounts = new Map<string, number>([
		['0', 0],
		['1–99', 0],
		['100–199', 0],
		['200–299', 0],
		['≥300', 0],
	]);

	for (const id of wordIds) {
		const row = infernoRows.find((r) => r.wordId === id);
		const score = row?.masteryScore ?? 0;
		const label = scoreBucketLabel(score);
		bucketCounts.set(label, (bucketCounts.get(label) ?? 0) + 1);
	}

	const scoreDistribution = [...bucketCounts.entries()].map(([label, count]) => ({
		label,
		count,
	}));

	const masteredCount = infernoRows.filter(
		(r) => r.masteryScore >= INFERNO_MASTERY_THRESHOLD,
	).length;

	const totalMasteryPoints = infernoRows.reduce((sum, r) => sum + r.masteryScore, 0);
	const avgMasteryScore = publishedCount > 0
		? Math.round(totalMasteryPoints / publishedCount)
		: 0;

	const logs = await prisma.cnAnswerLog.findMany({
		where: {
			userId,
			wordId: { in: wordIds },
			source: 'inferno',
		},
		select: { questionType: true, correct: true },
	});

	let mcqAnswered = 0;
	let fillAnswered = 0;
	let mcqRight = 0;
	let fillRight = 0;
	for (const log of logs) {
		if (isTypedQuestion(log.questionType)) {
			fillAnswered++;
			if (log.correct) fillRight++;
		} else {
			mcqAnswered++;
			if (log.correct) mcqRight++;
		}
	}

	const totalAnswered = logs.length;
	const totalCorrect = logs.filter((l) => l.correct).length;

	const toRank = (row: typeof infernoRows[number]): CnInfernoWordRankDTO => ({
		wordId: row.wordId,
		simplified: row.word.simplified,
		meaningVi: views.get(row.wordId)?.meaningVi ?? row.word.meaningVi,
		masteryScore: row.masteryScore,
	});

	const topMastered = [...infernoRows]
		.sort((a, b) => b.masteryScore - a.masteryScore)
		.slice(0, 10)
		.map(toRank);

	const stuckAtZero = infernoRows
		.filter((r) => r.masteryScore === 0 && r.wrongCount > 0)
		.sort((a, b) => b.wrongCount - a.wrongCount)
		.slice(0, 10)
		.map(toRank);

	const base = {
		totalEnrolled: publishedCount,
		masteredCount,
		avgMasteryScore,
		totalMasteryPoints,
		totalAnswered,
		overallAccuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
		mcqAccuracy: mcqAnswered > 0 ? Math.round((mcqRight / mcqAnswered) * 100) : 0,
		mcqTotal: mcqAnswered,
		fillAccuracy: fillAnswered > 0 ? Math.round((fillRight / fillAnswered) * 100) : 0,
		fillTotal: fillAnswered,
		scoreDistribution,
		topMastered,
		stuckAtZero,
		wordsWithProgress: infernoRows.length,
	};

	return {
		...base,
		insights: buildInfernoInsights(base),
	};
}
