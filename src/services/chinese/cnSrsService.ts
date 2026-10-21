/* ════════════════════════════════════════════════════════════════════════
   cnSrsService.ts — Multi-track stage-based SRS for Chinese vocabulary
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import {
	CN_STICKING_POINT_HEAVY_LAPSES,
	clampSrsIntervalIdx,
} from '@/config/constants';
import { reconcileSubmitItems } from '@/lib/chinese/answerGrading';
import { isChannelRampEligible } from '@/lib/chinese/channelRamp';
import { buildDueCandidateWhere } from '@/lib/chinese/cnSrsDueQuery';
import { isCoreQuestionType, questionChannel, type SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import { ensureEnrollmentForActiveWords, resolveSrsPoolWordIds } from '@/services/chinese/cnSrsEnrollmentService';
import { inferErrorType } from '@/lib/chinese/errorMapping';
import { rate } from '@/lib/chinese/hanziUtils';
import { requiredChannels, wordLevelState } from '@/lib/chinese/masteryModel';
import {
	computeNextReview,
	nextStateFromInterval,
	type ComputeNextReviewOptions,
} from '@/lib/chinese/srsSchedule';
import {
	ALL_SKILL_CHANNELS,
	CHANNEL_TO_GROUP,
	getWeakestChannel,
	pickChannelWeighted,
} from '@/lib/chinese/practiceTaxonomy';
import type {
	CnPracticeSubmitItem,
	CnWordProgressDTO,
	CnWordProgressState,
	CnErrorType,
} from '@/types/chinese';
import type { CnWord, CnWordProgress } from '@prisma/client';

export { computeNextReview, nextStateFromInterval } from '@/lib/chinese/srsSchedule';
export type { ComputeNextReviewOptions } from '@/lib/chinese/srsSchedule';

const CHANNEL_FIELDS: Record<SkillChannel, {
	dueAt: keyof CnWordProgress;
	intervalIdx: keyof CnWordProgress;
	correct: keyof CnWordProgress;
	total: keyof CnWordProgress;
}> = {
	meaning: { dueAt: 'meaningDueAt', intervalIdx: 'meaningIntervalIdx', correct: 'meaningCorrect', total: 'meaningTotal' },
	sound: { dueAt: 'soundDueAt', intervalIdx: 'soundIntervalIdx', correct: 'soundCorrect', total: 'soundTotal' },
	sentence: { dueAt: 'sentenceDueAt', intervalIdx: 'sentenceIntervalIdx', correct: 'sentenceCorrect', total: 'sentenceTotal' },
};

const HEAVY_LAPSE_FIELDS: Record<SkillChannel, keyof CnWordProgress> = {
	meaning: 'meaningHeavyLapses',
	sound: 'soundHeavyLapses',
	sentence: 'sentenceHeavyLapses',
};

export interface DueChannelEntry {
	progress: CnWordProgress & { word: CnWord };
	channel: SkillChannel;
	priority: number;
}

function getChannelDueAt(p: CnWordProgress, channel: SkillChannel, fallback: Date): Date {
	const field = CHANNEL_FIELDS[channel].dueAt;
	const value = p[field];
	return value instanceof Date ? value : fallback;
}

export function getChannelIntervalIdx(p: CnWordProgress, channel: SkillChannel): number {
	const field = CHANNEL_FIELDS[channel].intervalIdx;
	const value = p[field];
	return typeof value === 'number' ? clampSrsIntervalIdx(value) : 0;
}

function channelRate(p: CnWordProgress, channel: SkillChannel): number {
	const fields = CHANNEL_FIELDS[channel];
	const correct = p[fields.correct] as number;
	const total = p[fields.total] as number;
	return rate(correct, total);
}

export function isChannelDue(
	p: CnWordProgress,
	channel: SkillChannel,
	now: Date,
): boolean {
	if (!isChannelRampEligible(p, channel)) return false;
	const total = p[CHANNEL_FIELDS[channel].total] as number;
	if (total === 0) return true;

	const dueAt = getChannelDueAt(p, channel, p.dueAt);
	return dueAt <= now;
}

function aggregateDueAt(p: CnWordProgress, now: Date): Date {
	const dates = ALL_SKILL_CHANNELS.map((ch) => getChannelDueAt(p, ch, p.dueAt));
	const minDate = dates.reduce((min, d) => (d < min ? d : min), p.dueAt);
	return minDate <= now ? now : minDate;
}

function aggregateState(p: CnWordProgress): CnWordProgressState {
	// Callers without the fill-example set treat sentence as required only after it has been practiced.
	return wordLevelState(p, p.sentenceTotal > 0);
}

const PRACTICE_PRIORITY_REDUCTION = 20;
const PRACTICE_BOOST_MIN_ATTEMPTS = 5;
const PRACTICE_BOOST_MIN_RATE = 85;
const PRACTICE_LOOKBACK_MS = 7 * 86_400_000;

async function loadPracticePriorityAdjustments(
	userId: string,
	wordIds: string[],
): Promise<Map<string, number>> {
	if (!wordIds.length) return new Map();

	const since = new Date(Date.now() - PRACTICE_LOOKBACK_MS);
	const logs = await prisma.cnAnswerLog.findMany({
		where: {
			userId,
			wordId: { in: wordIds },
			source: 'practice',
			createdAt: { gte: since },
		},
		select: { wordId: true, questionType: true, correct: true, hintUsed: true },
	});

	const stats = new Map<string, { correct: number; total: number }>();
	for (const log of logs) {
		if (log.hintUsed) continue;
		const channel = isCoreQuestionType(log.questionType)
			? questionChannel(log.questionType)
			: null;
		if (!channel) continue;
		const key = `${log.wordId}:${channel}`;
		const row = stats.get(key) ?? { correct: 0, total: 0 };
		row.total++;
		if (log.correct) row.correct++;
		stats.set(key, row);
	}

	const adjustments = new Map<string, number>();
	for (const [key, row] of stats) {
		const chRate = row.total ? (row.correct / row.total) * 100 : 0;
		if (row.total >= PRACTICE_BOOST_MIN_ATTEMPTS && chRate >= PRACTICE_BOOST_MIN_RATE) {
			adjustments.set(key, -PRACTICE_PRIORITY_REDUCTION);
		}
	}
	return adjustments;
}

function channelReviewPriority(
	p: CnWordProgress,
	channel: SkillChannel,
	now: Date,
	practiceAdjust = 0,
): number {
	const dto = progressToDTO(p);
	let score = 0;

	const dueAt = getChannelDueAt(p, channel, p.dueAt);
	const overdueMs = Math.max(0, now.getTime() - dueAt.getTime());
	score += Math.min(overdueMs / 86_400_000, 30) * 10;

	const chRate = channelRate(p, channel);
	const total = p[CHANNEL_FIELDS[channel].total] as number;
	const sampleWeight = Math.min(1, total / 5);
	score += (100 - chRate) * 2 * sampleWeight;

	if (total === 0) score += 50;

	score += Math.random() * channelWeaknessJitter(dto, channel);
	score += practiceAdjust;

	return Math.max(0, score);
}

function channelWeaknessJitter(dto: CnWordProgressDTO, channel: SkillChannel): number {
	const rates: Record<SkillChannel, number> = {
		meaning: dto.meaningRate,
		sound: dto.soundRate,
		sentence: dto.sentenceRate,
	};
	return (100 - rates[channel]) * 0.5;
}

function collectDueChannelsForProgress(
	p: CnWordProgress & { word: CnWord },
	now: Date,
	practiceAdjustments?: Map<string, number>,
	wordsWithFillExamples?: Set<string>,
): DueChannelEntry[] {
	const dto = progressToDTO(p);
	const dueChannels = ALL_SKILL_CHANNELS.filter((ch) => {
		if (ch === 'sentence' && wordsWithFillExamples && !wordsWithFillExamples.has(p.wordId)) {
			return false;
		}
		return isChannelDue(p, ch, now);
	});

	if (!dueChannels.length) return [];

	const ordered: SkillChannel[] = [];
	const remaining = [...dueChannels];
	while (remaining.length) {
		const picked = pickChannelWeighted(dto, remaining);
		ordered.push(picked);
		remaining.splice(remaining.indexOf(picked), 1);
	}

	return ordered.map((channel) => ({
		progress: p,
		channel,
		priority: channelReviewPriority(
			p,
			channel,
			now,
			practiceAdjustments?.get(`${p.wordId}:${channel}`) ?? 0,
		),
	}));
}

export function countDueChannelsForProgressList(
	progressList: CnWordProgress[],
	now = new Date(),
	wordsWithFillExamples?: Set<string>,
): number {
	let count = 0;
	for (const p of progressList) {
		for (const ch of ALL_SKILL_CHANNELS) {
			if (ch === 'sentence' && wordsWithFillExamples && !wordsWithFillExamples.has(p.wordId)) {
				continue;
			}
			if (isChannelDue(p, ch, now)) count++;
		}
	}
	return count;
}

export async function loadWordIdsWithFillExamples(wordIds: string[], userId?: string): Promise<Set<string>> {
	if (!wordIds.length) return new Set();
	const rows = await prisma.cnExample.findMany({
		where: {
			wordId: { in: wordIds },
			naturalnessStatus: { in: ['auto', 'verified'] },
			targetWordStart: { not: null },
			targetWordEnd: { not: null },
			...(userId
				? { OR: [{ ownerUserId: null }, { ownerUserId: userId }] }
				: { ownerUserId: null }),
		},
		select: { wordId: true, ownerUserId: true },
	});
	if (!userId) return new Set(rows.map((row) => row.wordId));

	const replaced = new Set(
		(await prisma.cnExample.findMany({
			where: { wordId: { in: wordIds }, ownerUserId: userId },
			select: { wordId: true },
			distinct: ['wordId'],
		})).map((row) => row.wordId),
	);
	const ownFill = new Set(rows.filter((row) => row.ownerUserId === userId).map((row) => row.wordId));
	const canonicalFill = new Set(rows.filter((row) => row.ownerUserId == null).map((row) => row.wordId));
	const result = new Set<string>();
	for (const wordId of wordIds) {
		if (replaced.has(wordId)) {
			if (ownFill.has(wordId)) result.add(wordId);
		} else if (canonicalFill.has(wordId)) {
			result.add(wordId);
		}
	}
	return result;
}

async function fetchDueCandidateProgress(
	userId: string,
	wordIds: string[],
	now: Date,
	includeWord = false,
): Promise<CnWordProgress[]> {
	if (!wordIds.length) return [];
	return prisma.cnWordProgress.findMany({
		where: buildDueCandidateWhere(userId, wordIds, now),
		...(includeWord ? { include: { word: true } } : {}),
	});
}

/** Shared SQL superset prefilter for set-level due counts */
export async function fetchProgressDueCandidates(
	userId: string,
	wordIds: string[],
	now = new Date(),
): Promise<CnWordProgress[]> {
	return fetchDueCandidateProgress(userId, wordIds, now, false);
}

export async function getDueChannels(userId: string, limit = 50): Promise<DueChannelEntry[]> {
	const now = new Date();
	const activeIds = await resolveSrsPoolWordIds(userId);
	if (!activeIds.size) return [];

	await ensureEnrollmentForActiveWords(userId, [...activeIds]);

	const all = await fetchDueCandidateProgress(userId, [...activeIds], now, true) as Array<
		CnWordProgress & { word: CnWord }
	>;

	const wordIds = [...new Set(all.map((p) => p.wordId))];
	const [practiceAdjustments, wordsWithFillExamples] = await Promise.all([
		loadPracticePriorityAdjustments(userId, wordIds),
		loadWordIdsWithFillExamples(wordIds, userId),
	]);

	const entries = all.flatMap((p) =>
		collectDueChannelsForProgress(p, now, practiceAdjustments, wordsWithFillExamples),
	);
	return entries
		.sort((a, b) => b.priority - a.priority)
		.slice(0, limit);
}

export async function getReviewSession(userId: string, limit = 25): Promise<DueChannelEntry[]> {
	return getDueChannels(userId, limit);
}

function resolveSubmitErrorType(item: CnPracticeSubmitItem): CnErrorType | null {
	if (item.correct) return null;
	if (item.errorType) return item.errorType;
	return inferErrorType(item.questionType);
}

async function validateSubmitWordIds(wordIds: string[]): Promise<void> {
	const wordCount = await prisma.cnWord.count({ where: { id: { in: wordIds } } });
	if (wordCount !== wordIds.length) {
		throw new AppError('Một hoặc nhiều wordId không hợp lệ', 400);
	}
}

/** Practice sessions — log answers only, no SRS progress updates */
export async function logPracticeAnswers(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<{ logged: number }> {
	if (!items.length) return { logged: 0 };

	const wordIds = [...new Set(items.map((i) => i.wordId))];
	await validateSubmitWordIds(wordIds);

	const reconciled = await reconcileSubmitItems(items);

	const answerLogs = reconciled.map((item) => ({
		userId,
		wordId: item.wordId,
		questionType: item.questionType,
		correct: item.correct,
		errorType: resolveSubmitErrorType(item),
		source: 'practice' as const,
		hintUsed: item.hintUsed === true,
		responseMs: item.responseMs,
	}));

	await prisma.cnAnswerLog.createMany({ data: answerLogs });
	return { logged: reconciled.length };
}

/** Review sessions — full SRS updates */
export async function submitReviewResults(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<{ updated: number }> {
	if (!items.length) return { updated: 0 };

	const now = new Date();
	const wordIds = [...new Set(items.map((i) => i.wordId))];
	await validateSubmitWordIds(wordIds);

	const activeIds = await resolveSrsPoolWordIds(userId);
	const notEnrolled = wordIds.filter((id) => !activeIds.has(id));
	if (notEnrolled.length) {
		throw new AppError('Một hoặc nhiều từ chưa được đưa vào SRS', 400);
	}

	const existing = await prisma.cnWordProgress.findMany({
		where: { userId, wordId: { in: wordIds } },
	});
	const progressMap = new Map(existing.map((p) => [p.wordId, { ...p }]));
	const loadedWordIds = new Set(existing.map((p) => p.wordId));

	const missingProgress = wordIds.filter((id) => !loadedWordIds.has(id));
	if (missingProgress.length) {
		throw new AppError('Một hoặc nhiều từ chưa có tiến độ SRS', 400);
	}

	const reconciled = await reconcileSubmitItems(items);

	for (const item of reconciled) {
		const progress = progressMap.get(item.wordId)!;
		applyPracticeItem(progress, item, now, false);
	}

	const answerLogs = reconciled.map((item) => ({
		userId,
		wordId: item.wordId,
		questionType: item.questionType,
		correct: item.correct,
		errorType: resolveSubmitErrorType(item),
		source: 'review' as const,
		hintUsed: item.hintUsed === true,
		responseMs: item.responseMs,
	}));

	const updates: Array<{ wordId: string; data: Parameters<typeof prisma.cnWordProgress.update>[0]['data'] }> = [];
	for (const [wordId, progress] of progressMap) {
		updates.push({ wordId, data: progressToWriteData(progress) });
	}

	await prisma.$transaction([
		...updates.map(({ wordId, data }) =>
			prisma.cnWordProgress.update({
				where: { userId_wordId: { userId, wordId } },
				data,
			}),
		),
		prisma.cnAnswerLog.createMany({ data: answerLogs }),
	]);

	return { updated: items.length };
}

/** @deprecated Use logPracticeAnswers or submitReviewResults */
export async function submitPracticeResults(
	userId: string,
	items: CnPracticeSubmitItem[],
): Promise<{ updated: number }> {
	const result = await submitReviewResults(userId, items);
	return { updated: result.updated };
}

function createEmptyProgress(userId: string, wordId: string, now: Date): CnWordProgress {
	return {
		id: '',
		userId,
		wordId,
		state: 'new',
		dueAt: now,
		intervalIdx: 0,
		lastReviewedAt: null,
		meaningCorrect: 0,
		meaningTotal: 0,
		soundCorrect: 0,
		soundTotal: 0,
		sentenceCorrect: 0,
		sentenceTotal: 0,
		meaningDueAt: null,
		meaningIntervalIdx: 0,
		soundDueAt: null,
		soundIntervalIdx: 0,
		sentenceDueAt: null,
		sentenceIntervalIdx: 0,
		sentenceUnlockedAt: null,
		lastExampleId: null,
		meaningHeavyLapses: 0,
		soundHeavyLapses: 0,
		sentenceHeavyLapses: 0,
		isStickingPoint: false,
		meaningMarkedKnownAt: null,
		soundMarkedKnownAt: null,
		sentenceMarkedKnownAt: null,
		sentenceIntroDayKey: null,
		sentenceIntroDayCount: 0,
		introducedAt: null,
		createdAt: now,
		updatedAt: now,
	};
}

function incrementHeavyLapse(progress: CnWordProgress, channel: SkillChannel): void {
	const field = HEAVY_LAPSE_FIELDS[channel];
	const current = progress[field] as number;
	(progress[field] as number) = current + 1;
	if ((progress[field] as number) >= CN_STICKING_POINT_HEAVY_LAPSES) {
		progress.isStickingPoint = true;
	}
}

function applyPracticeItem(
	progress: CnWordProgress,
	item: CnPracticeSubmitItem,
	now: Date,
	isCreateBranch: boolean,
): void {
	const channel = questionChannel(item.questionType);
	const independentCorrect = item.correct && item.hintUsed !== true;

	const reviewOpts = (idx: number): ComputeNextReviewOptions => ({
		intervalIdx: idx,
		correct: item.correct,
		now,
		hintUsed: item.hintUsed === true,
	});

	progress.lastReviewedAt = now;

	if (isCreateBranch) {
		const next = computeNextReview(reviewOpts(0));
		progress.state = next.state;
		progress.dueAt = next.dueAt;
		progress.intervalIdx = next.intervalIdx;
		if (channel) {
			const fields = CHANNEL_FIELDS[channel];
			(progress[fields.dueAt] as Date | null) = next.dueAt;
			(progress[fields.intervalIdx] as number) = next.intervalIdx;
			(progress[fields.correct] as number) = independentCorrect ? 1 : 0;
			(progress[fields.total] as number) = 1;
		}
		return;
	}

	if (channel) {
		const fields = CHANNEL_FIELDS[channel];
		const chIdx = getChannelIntervalIdx(progress, channel);
		const chNext = computeNextReview(reviewOpts(chIdx));
		(progress[fields.dueAt] as Date | null) = chNext.dueAt;
		(progress[fields.intervalIdx] as number) = chNext.intervalIdx;
		(progress[fields.correct] as number) = (progress[fields.correct] as number) + (independentCorrect ? 1 : 0);
		(progress[fields.total] as number) = (progress[fields.total] as number) + 1;
		if (!item.correct && chIdx >= 2) {
			incrementHeavyLapse(progress, channel);
		}
	} else {
		const next = computeNextReview(reviewOpts(progress.intervalIdx));
		progress.dueAt = next.dueAt;
		progress.intervalIdx = next.intervalIdx;
		progress.state = next.state;
	}

	progress.dueAt = aggregateDueAt(progress, now);
	progress.state = aggregateState(progress);
	const levelChannels = requiredChannels(progress.sentenceTotal > 0);
	progress.intervalIdx = Math.min(
		...levelChannels.map((channel) => getChannelIntervalIdx(progress, channel)),
	);

	if (channel === 'sentence' && item.exampleId) {
		progress.lastExampleId = item.exampleId;
	}
}

function progressToWriteData(progress: CnWordProgress): Parameters<typeof prisma.cnWordProgress.create>[0]['data'] {
	return {
		userId: progress.userId,
		wordId: progress.wordId,
		state: progress.state,
		dueAt: progress.dueAt,
		intervalIdx: progress.intervalIdx,
		lastReviewedAt: progress.lastReviewedAt,
		meaningCorrect: progress.meaningCorrect,
		meaningTotal: progress.meaningTotal,
		soundCorrect: progress.soundCorrect,
		soundTotal: progress.soundTotal,
		sentenceCorrect: progress.sentenceCorrect,
		sentenceTotal: progress.sentenceTotal,
		meaningDueAt: progress.meaningDueAt,
		meaningIntervalIdx: progress.meaningIntervalIdx,
		soundDueAt: progress.soundDueAt,
		soundIntervalIdx: progress.soundIntervalIdx,
		sentenceDueAt: progress.sentenceDueAt,
		sentenceIntervalIdx: progress.sentenceIntervalIdx,
		sentenceUnlockedAt: progress.sentenceUnlockedAt,
		lastExampleId: progress.lastExampleId,
		meaningHeavyLapses: progress.meaningHeavyLapses,
		soundHeavyLapses: progress.soundHeavyLapses,
		sentenceHeavyLapses: progress.sentenceHeavyLapses,
		isStickingPoint: progress.isStickingPoint,
		meaningMarkedKnownAt: progress.meaningMarkedKnownAt,
		soundMarkedKnownAt: progress.soundMarkedKnownAt,
		sentenceMarkedKnownAt: progress.sentenceMarkedKnownAt,
		sentenceIntroDayKey: progress.sentenceIntroDayKey,
		sentenceIntroDayCount: progress.sentenceIntroDayCount,
		introducedAt: progress.introducedAt,
	};
}

/** @internal Exported for unit tests — in-memory submit merge */
export function mergeSubmitItemsInMemory(
	userId: string,
	items: CnPracticeSubmitItem[],
	existing: CnWordProgress[],
	now = new Date(),
): { progressByWordId: Map<string, CnWordProgress>; answerLogCount: number } {
	const progressMap = new Map(existing.map((p) => [p.wordId, { ...p }]));
	const loadedWordIds = new Set(existing.map((p) => p.wordId));
	const processedInBatch = new Set<string>();

	for (const item of items) {
		let progress = progressMap.get(item.wordId);
		const isCreateBranch = !loadedWordIds.has(item.wordId) && !processedInBatch.has(item.wordId);
		if (!progress) {
			progress = createEmptyProgress(userId, item.wordId, now);
			progressMap.set(item.wordId, progress);
		}
		applyPracticeItem(progress, item, now, isCreateBranch);
		processedInBatch.add(item.wordId);
	}

	return { progressByWordId: progressMap, answerLogCount: items.length };
}

export function progressToDTO(p: CnWordProgress): CnWordProgressDTO {
	return {
		wordId: p.wordId,
		state: p.state,
		dueAt: p.dueAt.toISOString(),
		intervalIdx: p.intervalIdx,
		lastReviewedAt: p.lastReviewedAt?.toISOString() ?? null,
		meaningRate: rate(p.meaningCorrect, p.meaningTotal),
		soundRate: rate(p.soundCorrect, p.soundTotal),
		sentenceRate: rate(p.sentenceCorrect, p.sentenceTotal),
		meaningTotal: p.meaningTotal,
		soundTotal: p.soundTotal,
		sentenceTotal: p.sentenceTotal,
		meaningIntervalIdx: p.meaningIntervalIdx,
		soundIntervalIdx: p.soundIntervalIdx,
		sentenceIntervalIdx: p.sentenceIntervalIdx,
		isStickingPoint: p.isStickingPoint,
		lastExampleId: p.lastExampleId,
	};
}

export async function countDueChannels(userId: string): Promise<number> {
	const activeIds = await resolveSrsPoolWordIds(userId);
	if (!activeIds.size) return 0;
	const wordIdList = [...activeIds];
	await ensureEnrollmentForActiveWords(userId, wordIdList);
	const now = new Date();
	const [all, wordsWithFillExamples] = await Promise.all([
		fetchDueCandidateProgress(userId, wordIdList, now),
		loadWordIdsWithFillExamples(wordIdList, userId),
	]);
	return countDueChannelsForProgressList(all, now, wordsWithFillExamples);
}

/** Counts (word, channel) pairs due today */
export async function countDueToday(userId: string): Promise<number> {
	return countDueChannels(userId);
}

export { CHANNEL_TO_GROUP, getWeakestChannel };
