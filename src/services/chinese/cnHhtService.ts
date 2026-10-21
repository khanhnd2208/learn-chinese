/* ════════════════════════════════════════════════════════════════════════
   cnHhtService.ts — HHT Mode: MCQ practice across all SRS-active sets
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { PRACTICE_MCQ_TYPES, wordSupportsQuestionType } from '@/lib/chinese/practiceTaxonomy';
import {
	generatePracticeSession,
	mergeWordPools,
} from '@/lib/chinese/generateQuestions';
import {
	CN_HHT_PREFETCH_SIZE,
	HHT_MIN_WEIGHT,
	HHT_WEIGHT_DECAY,
} from '@/config/constants';
import { getWordCardsForSrsPool, getUserDistractorPool } from '@/services/chinese/cnContentService';
import {
	ensureEnrollmentForActiveWords,
	resolveSrsPoolWordIds,
} from '@/services/chinese/cnSrsEnrollmentService';
import { progressToDTO } from '@/services/chinese/cnSrsService';
import { prepareSubmitItems } from '@/lib/chinese/answerGrading';
import {
	loadVisibleExampleWordIds,
	loggedAttempts,
	loggedExampleId,
	loggedSentenceAnswer,
} from '@/services/chinese/cnAnswerLogContext';
import type {
	CnPracticeQuestionDTO,
	CnPracticeSubmitItem,
	CnWordCardDTO,
	CnWordProgressDTO,
} from '@/types/chinese';

export interface HhtSetWordEntry {
	setId: string;
	wordId: string;
}

export interface HhtSessionResult {
	questions: CnPracticeQuestionDTO[];
	totalEnrolled: number;
	activeSetCount: number;
	eligibleWordCount: number;
}

function shuffleArray<T>(arr: T[], rng: () => number = Math.random): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

/** Apply weight decay after a correct answer; wrong answers keep weight unchanged. */
export function applyHhtWeightDecay(currentWeight: number, correct: boolean): number {
	if (!correct) return currentWeight;
	return Math.max(HHT_MIN_WEIGHT, currentWeight * HHT_WEIGHT_DECAY);
}

function wordSupportsAnyMcq(word: CnWordCardDTO): boolean {
	return PRACTICE_MCQ_TYPES.some((type) => wordSupportsQuestionType(word, type));
}

/** Count sets the user is actively reviewing. */
export async function countSrsActiveSets(userId: string): Promise<number> {
	return prisma.cnSetEnrollment.count({
		where: { userId, srsActive: true },
	});
}

/** Stats when the session cannot generate questions yet (pool may still be non-empty). */
export function hhtSessionStatsWhenNoQuestions(
	wordCount: number,
	activeSetCount: number,
	eligibleWordCount = 0,
): Pick<HhtSessionResult, 'totalEnrolled' | 'activeSetCount' | 'eligibleWordCount'> {
	return {
		totalEnrolled: wordCount,
		activeSetCount,
		eligibleWordCount,
	};
}

/** SRS-active set items with published wordId. */
export async function buildHhtSetWordEntries(userId: string): Promise<HhtSetWordEntry[]> {
	const items = await prisma.cnWordSetItem.findMany({
		where: {
			wordId: { not: null },
			set: { enrollments: { some: { userId, srsActive: true } } },
		},
		select: { setId: true, wordId: true },
	});

	const seen = new Set<string>();
	const entries: HhtSetWordEntry[] = [];
	for (const item of items) {
		if (!item.wordId) continue;
		const key = `${item.setId}:${item.wordId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		entries.push({ setId: item.setId, wordId: item.wordId });
	}
	return entries;
}

/**
 * Fair batch pick: round-robin across sets, weighted random within each set.
 * Debounces recentWordIds like Inferno.
 */
export function pickHhtWordBatch(
	entries: HhtSetWordEntry[],
	weightMap: Map<string, number>,
	limit: number,
	recentWordIds: string[] = [],
	rng: () => number = Math.random,
): string[] {
	if (entries.length === 0 || limit <= 0) return [];

	const bySet = new Map<string, HhtSetWordEntry[]>();
	for (const entry of entries) {
		const group = bySet.get(entry.setId) ?? [];
		group.push(entry);
		bySet.set(entry.setId, group);
	}

	const setIds = [...bySet.keys()];
	const setPickCounts = new Map<string, number>(setIds.map((id) => [id, 0]));
	const result: string[] = [];
	const recentSet = new Set(recentWordIds.slice(-20));

	for (let pick = 0; pick < limit; pick++) {
		const sortedSets = [...setIds].sort((a, b) => {
			const ca = setPickCounts.get(a) ?? 0;
			const cb = setPickCounts.get(b) ?? 0;
			if (ca !== cb) return ca - cb;
			return rng() - 0.5;
		});

		let chosen: HhtSetWordEntry | null = null;

		for (const setId of sortedSets) {
			const pool = bySet.get(setId) ?? [];
			let candidates = pool.filter((e) => !recentSet.has(e.wordId));
			if (!candidates.length) {
				candidates = pool.filter((e) => !new Set(recentWordIds.slice(-10)).has(e.wordId));
			}
			if (!candidates.length) candidates = [...pool];
			if (!candidates.length) continue;

			const weights = candidates.map((e) => weightMap.get(e.wordId) ?? 1);
			const totalWeight = weights.reduce((sum, w) => sum + w, 0);
			let roll = rng() * totalWeight;
			for (let i = 0; i < candidates.length; i++) {
				roll -= weights[i];
				if (roll <= 0) {
					chosen = candidates[i];
					break;
				}
			}
			if (!chosen) chosen = candidates[candidates.length - 1];
			break;
		}

		if (!chosen) break;

		result.push(chosen.wordId);
		setPickCounts.set(chosen.setId, (setPickCounts.get(chosen.setId) ?? 0) + 1);
		recentSet.add(chosen.wordId);
	}

	return result;
}

export async function buildHhtSession(
	userId: string,
	limit = CN_HHT_PREFETCH_SIZE,
	recentWordIds: string[] = [],
): Promise<HhtSessionResult> {
	const activeWordIds = await resolveSrsPoolWordIds(userId);
	const wordIds = [...activeWordIds];
	await ensureEnrollmentForActiveWords(userId, wordIds);

	const [activeSetCount, entries] = await Promise.all([
		countSrsActiveSets(userId),
		buildHhtSetWordEntries(userId),
	]);

	if (!wordIds.length) {
		return {
			questions: [],
			...hhtSessionStatsWhenNoQuestions(0, 0),
		};
	}

	if (!entries.length) {
		return {
			questions: [],
			...hhtSessionStatsWhenNoQuestions(wordIds.length, activeSetCount),
		};
	}

	const [cardMap, globalPool, progressRows, hhtRows] = await Promise.all([
		getWordCardsForSrsPool(userId, wordIds),
		getUserDistractorPool(userId),
		prisma.cnWordProgress.findMany({ where: { userId, wordId: { in: wordIds } } }),
		prisma.cnHhtProgress.findMany({ where: { userId, wordId: { in: wordIds } } }),
	]);

	const weightMap = new Map<string, number>();
	for (const id of wordIds) weightMap.set(id, 1);
	for (const row of hhtRows) weightMap.set(row.wordId, row.selectionWeight);

	const eligibleEntries = entries.filter((e) => {
		const card = cardMap.get(e.wordId);
		return card && wordSupportsAnyMcq(card);
	});

	const eligibleWordCount = new Set(eligibleEntries.map((e) => e.wordId)).size;

	if (!eligibleEntries.length) {
		return {
			questions: [],
			totalEnrolled: wordIds.length,
			activeSetCount,
			eligibleWordCount: 0,
		};
	}

	const pickedWordIds = pickHhtWordBatch(eligibleEntries, weightMap, limit, recentWordIds);
	const pickedCards = pickedWordIds
		.map((id) => cardMap.get(id))
		.filter((c): c is CnWordCardDTO => !!c && wordSupportsAnyMcq(c));

	if (!pickedCards.length) {
		return {
			questions: [],
			totalEnrolled: wordIds.length,
			activeSetCount,
			eligibleWordCount,
		};
	}

	const progressMap = new Map<string, CnWordProgressDTO | null>();
	for (const id of wordIds) progressMap.set(id, null);
	for (const p of progressRows) progressMap.set(p.wordId, progressToDTO(p));

	const publishedCards = [...cardMap.values()].filter(wordSupportsAnyMcq);
	const distractorPool = mergeWordPools(publishedCards, globalPool);

	const questions = generatePracticeSession(pickedCards, pickedCards.length, {
		practiceFormat: 'mcq',
		progressMap,
		distractorPool,
	});

	return {
		questions: shuffleArray(questions),
		totalEnrolled: wordIds.length,
		activeSetCount,
		eligibleWordCount,
	};
}

export async function submitHhtResults(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<{ updated: number }> {
	const now = new Date();
	const fresh = await prepareSubmitItems(userId, items);
	const exampleWordIds = await loadVisibleExampleWordIds(
		userId,
		fresh.flatMap((item) => item.exampleId ? [item.exampleId] : []),
	);

	for (const item of fresh) {
		const existing = await prisma.cnHhtProgress.findUnique({
			where: { userId_wordId: { userId, wordId: item.wordId } },
		});
		const prevWeight = existing?.selectionWeight ?? 1;
		const newWeight = applyHhtWeightDecay(prevWeight, item.correct);

		await prisma.cnHhtProgress.upsert({
			where: { userId_wordId: { userId, wordId: item.wordId } },
			create: {
				userId,
				wordId: item.wordId,
				selectionWeight: newWeight,
				correctCount: item.correct ? 1 : 0,
				wrongCount: item.correct ? 0 : 1,
				lastAnsweredAt: now,
			},
			update: {
				selectionWeight: newWeight,
				correctCount: { increment: item.correct ? 1 : 0 },
				wrongCount: { increment: item.correct ? 0 : 1 },
				lastAnsweredAt: now,
			},
		});

		await prisma.cnAnswerLog.create({
			data: {
				userId,
				wordId: item.wordId,
				questionType: item.questionType,
				correct: item.correct,
				source: 'hht',
				clientAnswerId: item.clientAnswerId ?? null,
				exampleId: loggedExampleId(item, exampleWordIds),
				answer: loggedSentenceAnswer(item),
				hintUsed: item.hintUsed === true,
				responseMs: item.responseMs ?? null,
				attempts: loggedAttempts(item),
			},
		});
	}

	return { updated: fresh.length };
}

export async function getHhtGateStats(userId: string): Promise<{
	totalEnrolled: number;
	activeSetCount: number;
	eligibleWordCount: number;
}> {
	const [wordIds, activeSetCount] = await Promise.all([
		resolveSrsPoolWordIds(userId),
		countSrsActiveSets(userId),
	]);
	const wordIdList = [...wordIds];

	if (!wordIdList.length) {
		return { totalEnrolled: 0, activeSetCount, eligibleWordCount: 0 };
	}

	const cardMap = await getWordCardsForSrsPool(userId, wordIdList);
	const eligibleWordCount = wordIdList.filter((id) => {
		const card = cardMap.get(id);
		return card && wordSupportsAnyMcq(card);
	}).length;

	return {
		totalEnrolled: wordIds.size,
		activeSetCount,
		eligibleWordCount,
	};
}
