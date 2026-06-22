/* ════════════════════════════════════════════════════════════════════════
   cnSrsService.ts — Multi-track Leitner SRS for Chinese vocabulary
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import {
	CN_FIRST_WRONG_RETRY_MINUTES,
	CN_CHANNEL_WEAK_THRESHOLD,
	CN_LAPSE_FLOOR_IDX,
	CN_LAPSE_HEAVY_IDX,
	CN_MARK_KNOWN_COOLDOWN_MS,
	CN_MARK_KNOWN_CORRECT_STEPS,
	CN_MARK_KNOWN_HIDE_IDX,
	CN_SRS_INTERVALS_MINUTES,
	CN_STATE_THRESHOLDS,
	CN_STICKING_POINT_HEAVY_LAPSES,
	CN_INTRO_PRIORITY_CAP,
} from '@/config/constants';
import {
	bumpIntroDayCount,
	getChannelIntroPhase,
	introPriorityMultiplier,
	isIntroChannelDueToday,
	maybeSetChannelUnlocked,
} from '@/lib/chinese/channelIntro';
import { isChannelRampEligible } from '@/lib/chinese/channelRamp';
import { reconcileSubmitItems } from '@/lib/chinese/answerGrading';
import { buildDueCandidateWhere } from '@/lib/chinese/cnSrsDueQuery';
import { isCoreQuestionType, questionChannel, type SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import { getSrsActiveWordIds } from '@/services/chinese/cnSrsEnrollmentService';
import { errorSeverity, inferErrorType } from '@/lib/chinese/errorMapping';
import { rate } from '@/lib/chinese/hanziUtils';
import {
	ALL_SKILL_CHANNELS,
	CHANNEL_TO_GROUP,
	getWeakestChannel,
	isChannelUnlocked,
	pickChannelWeighted,
} from '@/lib/chinese/practiceTaxonomy';
import type {
	CnPracticeSubmitItem,
	CnWordProgressDTO,
	CnWordProgressState,
	CnErrorType,
	CnQuestionType,
} from '@/types/chinese';
import type { CnWord, CnWordProgress } from '@prisma/client';

const CHANNEL_FIELDS: Record<SkillChannel, {
	dueAt: keyof CnWordProgress;
	intervalIdx: keyof CnWordProgress;
	correct: keyof CnWordProgress;
	total: keyof CnWordProgress;
}> = {
	meaning: { dueAt: 'meaningDueAt', intervalIdx: 'meaningIntervalIdx', correct: 'meaningCorrect', total: 'meaningTotal' },
	listening: { dueAt: 'listeningDueAt', intervalIdx: 'listeningIntervalIdx', correct: 'listeningCorrect', total: 'listeningTotal' },
	pinyin: { dueAt: 'pinyinDueAt', intervalIdx: 'pinyinIntervalIdx', correct: 'pinyinCorrect', total: 'pinyinTotal' },
	sentence: { dueAt: 'sentenceDueAt', intervalIdx: 'sentenceIntervalIdx', correct: 'sentenceCorrect', total: 'sentenceTotal' },
};

const HEAVY_LAPSE_FIELDS: Record<SkillChannel, keyof CnWordProgress> = {
	meaning: 'meaningHeavyLapses',
	listening: 'listeningHeavyLapses',
	pinyin: 'pinyinHeavyLapses',
	sentence: 'sentenceHeavyLapses',
};

const MARKED_KNOWN_FIELDS: Record<SkillChannel, keyof CnWordProgress> = {
	meaning: 'meaningMarkedKnownAt',
	listening: 'listeningMarkedKnownAt',
	pinyin: 'pinyinMarkedKnownAt',
	sentence: 'sentenceMarkedKnownAt',
};

const STATE_RANK: Record<CnWordProgressState, number> = {
	new: 0,
	learning: 1,
	weak: 2,
	familiar: 3,
	strong: 4,
	mastered: 5,
};

export interface ComputeNextReviewOptions {
	intervalIdx: number;
	correct: boolean;
	now?: Date;
	lapseSeverity?: 'light' | 'heavy';
	isFirstChannelAttempt?: boolean;
}

export interface DueChannelEntry {
	progress: CnWordProgress & { word: CnWord };
	channel: SkillChannel;
	priority: number;
}

function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60_000);
}

export function nextStateFromInterval(intervalIdx: number, correct: boolean): CnWordProgressState {
	if (!correct) return 'weak';
	if (intervalIdx >= CN_STATE_THRESHOLDS.mastered) return 'mastered';
	if (intervalIdx >= CN_STATE_THRESHOLDS.strong) return 'strong';
	if (intervalIdx >= CN_STATE_THRESHOLDS.familiar) return 'familiar';
	return 'learning';
}

export function computeNextReview(options: ComputeNextReviewOptions): {
	dueAt: Date;
	intervalIdx: number;
	state: CnWordProgressState;
} {
	const {
		intervalIdx,
		correct,
		now = new Date(),
		lapseSeverity = 'light',
		isFirstChannelAttempt = false,
	} = options;

	if (!correct) {
		if (isFirstChannelAttempt) {
			return {
				dueAt: addMinutes(now, CN_FIRST_WRONG_RETRY_MINUTES),
				intervalIdx: 0,
				state: 'learning',
			};
		}
		const nextIdx = lapseSeverity === 'heavy'
			? CN_LAPSE_HEAVY_IDX
			: Math.max(intervalIdx - 1, CN_LAPSE_FLOOR_IDX);
		return {
			dueAt: addMinutes(now, CN_SRS_INTERVALS_MINUTES[nextIdx]),
			intervalIdx: nextIdx,
			state: 'weak',
		};
	}

	const step = 1;
	const nextIdx = Math.min(intervalIdx + step, CN_SRS_INTERVALS_MINUTES.length - 1);
	return {
		dueAt: addMinutes(now, CN_SRS_INTERVALS_MINUTES[nextIdx]),
		intervalIdx: nextIdx,
		state: nextStateFromInterval(nextIdx, true),
	};
}

function getChannelDueAt(p: CnWordProgress, channel: SkillChannel, fallback: Date): Date {
	const field = CHANNEL_FIELDS[channel].dueAt;
	const value = p[field];
	return value instanceof Date ? value : fallback;
}

export function getChannelIntervalIdx(p: CnWordProgress, channel: SkillChannel): number {
	const field = CHANNEL_FIELDS[channel].intervalIdx;
	const value = p[field];
	return typeof value === 'number' ? value : 0;
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
	dto?: CnWordProgressDTO | null,
): boolean {
	if (!isChannelUnlocked(dto ?? progressToDTO(p), channel)) return false;
	if (!isIntroChannelDueToday(p, channel, now)) return false;
	if (!isChannelRampEligible(p, channel)) return false;

	const total = p[CHANNEL_FIELDS[channel].total] as number;
	if (total === 0) return true;

	const dueAt = getChannelDueAt(p, channel, p.dueAt);
	if (dueAt <= now) return true;
	if (total <= 1) return false;
	return false;
}

function unlockedChannels(p: CnWordProgress, dto: CnWordProgressDTO): SkillChannel[] {
	return ALL_SKILL_CHANNELS.filter((ch) => isChannelUnlocked(dto, ch));
}

function aggregateDueAt(p: CnWordProgress, now: Date): Date {
	const dto = progressToDTO(p);
	const channels = unlockedChannels(p, dto);
	const dates = channels.map((ch) => getChannelDueAt(p, ch, p.dueAt));
	const minDate = dates.reduce((min, d) => (d < min ? d : min), p.dueAt);
	return minDate <= now ? now : minDate;
}

function aggregateState(p: CnWordProgress): CnWordProgressState {
	const dto = progressToDTO(p);
	const channels = unlockedChannels(p, dto);
	let lowest: CnWordProgressState | null = null;
	let hasPracticed = false;

	for (const ch of channels) {
		const total = p[CHANNEL_FIELDS[ch].total] as number;
		if (total === 0) continue;
		hasPracticed = true;
		const idx = getChannelIntervalIdx(p, ch);
		const chState = nextStateFromInterval(idx, channelRate(p, ch) >= CN_CHANNEL_WEAK_THRESHOLD);
		if (lowest === null || STATE_RANK[chState] < STATE_RANK[lowest]) lowest = chState;
	}

	if (!hasPracticed) return p.state;
	return lowest ?? p.state;
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
		select: { wordId: true, questionType: true, correct: true },
	});

	const stats = new Map<string, { correct: number; total: number }>();
	for (const log of logs) {
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
		const rate = row.total ? (row.correct / row.total) * 100 : 0;
		if (row.total >= PRACTICE_BOOST_MIN_ATTEMPTS && rate >= PRACTICE_BOOST_MIN_RATE) {
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

	const introPhase = getChannelIntroPhase(p, channel, now);
	score *= introPriorityMultiplier(introPhase);
	if (introPhase === 'intro') {
		score = Math.min(score, CN_INTRO_PRIORITY_CAP);
	}

	if (total === 0) score += 50;

	score += Math.random() * channelWeaknessJitter(dto, channel);
	score += practiceAdjust;

	return Math.max(0, score);
}

function channelWeaknessJitter(dto: CnWordProgressDTO, channel: SkillChannel): number {
	const rates: Record<SkillChannel, number> = {
		meaning: dto.meaningRate,
		listening: dto.listeningRate,
		pinyin: dto.pinyinRate,
		sentence: dto.sentenceRate,
	};
	return (100 - rates[channel]) * 0.5;
}

function collectDueChannelsForProgress(
	p: CnWordProgress & { word: CnWord },
	now: Date,
	practiceAdjustments?: Map<string, number>,
): DueChannelEntry[] {
	const dto = progressToDTO(p);
	const dueChannels = ALL_SKILL_CHANNELS.filter((ch) => isChannelDue(p, ch, now, dto));

	if (!dueChannels.length) return [];

	// Weighted order among due channels for this word (interleaving)
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
): number {
	let count = 0;
	for (const p of progressList) {
		const dto = progressToDTO(p);
		for (const ch of ALL_SKILL_CHANNELS) {
			if (isChannelDue(p, ch, now, dto)) count++;
		}
	}
	return count;
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
	const activeIds = await getSrsActiveWordIds(userId);
	if (!activeIds.size) return [];

	const all = await fetchDueCandidateProgress(userId, [...activeIds], now, true) as Array<
		CnWordProgress & { word: CnWord }
	>;

	const wordIds = [...new Set(all.map((p) => p.wordId))];
	const practiceAdjustments = await loadPracticePriorityAdjustments(userId, wordIds);

	const entries = all.flatMap((p) => collectDueChannelsForProgress(p, now, practiceAdjustments));
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

	const activeIds = await getSrsActiveWordIds(userId);
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
		listeningCorrect: 0,
		listeningTotal: 0,
		pinyinCorrect: 0,
		pinyinTotal: 0,
		sentenceCorrect: 0,
		sentenceTotal: 0,
		meaningDueAt: null,
		meaningIntervalIdx: 0,
		listeningDueAt: null,
		listeningIntervalIdx: 0,
		pinyinDueAt: null,
		pinyinIntervalIdx: 0,
		sentenceDueAt: null,
		sentenceIntervalIdx: 0,
		sentenceUnlockedAt: null,
		lastExampleId: null,
		meaningHeavyLapses: 0,
		listeningHeavyLapses: 0,
		pinyinHeavyLapses: 0,
		sentenceHeavyLapses: 0,
		isStickingPoint: false,
		meaningMarkedKnownAt: null,
		listeningMarkedKnownAt: null,
		pinyinMarkedKnownAt: null,
		sentenceMarkedKnownAt: null,
		sentenceIntroDayKey: null,
		sentenceIntroDayCount: 0,
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

export function canMarkChannelKnown(
	progress: CnWordProgress | null | undefined,
	channel: SkillChannel | null,
	now = new Date(),
): boolean {
	if (!progress || !channel) return false;
	const idx = getChannelIntervalIdx(progress, channel);
	if (idx >= CN_MARK_KNOWN_HIDE_IDX) return false;
	const markedField = MARKED_KNOWN_FIELDS[channel];
	const markedAt = progress[markedField];
	if (markedAt instanceof Date && now.getTime() - markedAt.getTime() < CN_MARK_KNOWN_COOLDOWN_MS) {
		return false;
	}
	return true;
}

export async function markChannelAsKnown(
	userId: string,
	wordId: string,
	questionType: CnQuestionType,
): Promise<{ intervalIdx: number; dueAt: string }> {
	const channel = questionChannel(questionType);

	const activeIds = await getSrsActiveWordIds(userId);
	if (!activeIds.has(wordId)) {
		throw new AppError('Từ chưa được đưa vào SRS', 400);
	}

	const now = new Date();
	const progress = await prisma.cnWordProgress.findUnique({
		where: { userId_wordId: { userId, wordId } },
	});

	if (!progress) {
		throw new AppError('Từ chưa có tiến độ SRS', 400);
	}

	if (!canMarkChannelKnown(progress, channel, now)) {
		throw new AppError('Không thể đánh dấu đã biết cho kênh này lúc này', 400);
	}

	const fields = CHANNEL_FIELDS[channel];
	let idx = getChannelIntervalIdx(progress, channel);

	for (let i = 0; i < CN_MARK_KNOWN_CORRECT_STEPS; i++) {
		const next = computeNextReview({
			intervalIdx: idx,
			correct: true,
			now,
		});
		idx = next.intervalIdx;
		(progress[fields.dueAt] as Date | null) = next.dueAt;
		(progress[fields.intervalIdx] as number) = next.intervalIdx;
	}

	(progress[fields.correct] as number) = (progress[fields.correct] as number) + CN_MARK_KNOWN_CORRECT_STEPS;
	(progress[fields.total] as number) = (progress[fields.total] as number) + CN_MARK_KNOWN_CORRECT_STEPS;
	(progress[MARKED_KNOWN_FIELDS[channel]] as Date | null) = now;
	progress.lastReviewedAt = now;
	maybeSetChannelUnlocked(progress, 'sentence', now);
	progress.dueAt = aggregateDueAt(progress, now);
	progress.state = aggregateState(progress);
	progress.intervalIdx = Math.max(
		getChannelIntervalIdx(progress, 'meaning'),
		getChannelIntervalIdx(progress, 'listening'),
		getChannelIntervalIdx(progress, 'pinyin'),
		getChannelIntervalIdx(progress, 'sentence'),
	);

	await prisma.$transaction([
		prisma.cnWordProgress.update({
			where: { userId_wordId: { userId, wordId } },
			data: progressToWriteData(progress),
		}),
		prisma.cnAnswerLog.create({
			data: {
				userId,
				wordId,
				questionType,
				correct: true,
				source: 'mark_known',
			},
		}),
	]);

	return {
		intervalIdx: idx,
		dueAt: (progress[fields.dueAt] as Date ?? progress.dueAt).toISOString(),
	};
}

function applyPracticeItem(
	progress: CnWordProgress,
	item: CnPracticeSubmitItem,
	now: Date,
	isCreateBranch: boolean,
): void {
	const channel = questionChannel(item.questionType);
	const lapseSeverity = item.correct
		? undefined
		: errorSeverity(resolveSubmitErrorType(item) ?? inferErrorType(item.questionType));

	const reviewOpts = (idx: number, isFirstChannelAttempt = false): ComputeNextReviewOptions => ({
		intervalIdx: idx,
		correct: item.correct,
		now,
		lapseSeverity,
		isFirstChannelAttempt,
	});

	progress.lastReviewedAt = now;

	if (isCreateBranch) {
		const isFirst = !channel || (progress[CHANNEL_FIELDS[channel].total] as number) === 0;
		const next = computeNextReview(reviewOpts(0, isFirst && !item.correct));
		progress.state = next.state;
		progress.dueAt = next.dueAt;
		progress.intervalIdx = next.intervalIdx;
		if (channel) {
			const fields = CHANNEL_FIELDS[channel];
			(progress[fields.dueAt] as Date | null) = next.dueAt;
			(progress[fields.intervalIdx] as number) = next.intervalIdx;
			(progress[fields.correct] as number) = item.correct ? 1 : 0;
			(progress[fields.total] as number) = 1;
			if (!item.correct && lapseSeverity === 'heavy') {
				incrementHeavyLapse(progress, channel);
			}
		}
		return;
	}

	if (channel) {
		const fields = CHANNEL_FIELDS[channel];
		const chIdx = getChannelIntervalIdx(progress, channel);
		// Per (word, channel): first attempt when this channel's total is still 0
		const isFirstAttempt = (progress[fields.total] as number) === 0;
		const chNext = computeNextReview(reviewOpts(chIdx, isFirstAttempt && !item.correct));
		(progress[fields.dueAt] as Date | null) = chNext.dueAt;
		(progress[fields.intervalIdx] as number) = chNext.intervalIdx;
		(progress[fields.correct] as number) = (progress[fields.correct] as number) + (item.correct ? 1 : 0);
		(progress[fields.total] as number) = (progress[fields.total] as number) + 1;
		if (!item.correct && lapseSeverity === 'heavy') {
			incrementHeavyLapse(progress, channel);
		}
		bumpIntroDayCount(progress, channel, now);
	} else {
		const next = computeNextReview(reviewOpts(progress.intervalIdx));
		progress.dueAt = next.dueAt;
		progress.intervalIdx = next.intervalIdx;
		progress.state = next.state;
	}

	progress.dueAt = aggregateDueAt(progress, now);
	progress.state = aggregateState(progress);
	if (getChannelIntervalIdx(progress, 'meaning') >= CN_STATE_THRESHOLDS.familiar) {
		maybeSetChannelUnlocked(progress, 'sentence', now);
	}
	progress.intervalIdx = Math.max(
		getChannelIntervalIdx(progress, 'meaning'),
		getChannelIntervalIdx(progress, 'listening'),
		getChannelIntervalIdx(progress, 'pinyin'),
		getChannelIntervalIdx(progress, 'sentence'),
	);
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
		listeningCorrect: progress.listeningCorrect,
		listeningTotal: progress.listeningTotal,
		pinyinCorrect: progress.pinyinCorrect,
		pinyinTotal: progress.pinyinTotal,
		sentenceCorrect: progress.sentenceCorrect,
		sentenceTotal: progress.sentenceTotal,
		meaningDueAt: progress.meaningDueAt,
		meaningIntervalIdx: progress.meaningIntervalIdx,
		listeningDueAt: progress.listeningDueAt,
		listeningIntervalIdx: progress.listeningIntervalIdx,
		pinyinDueAt: progress.pinyinDueAt,
		pinyinIntervalIdx: progress.pinyinIntervalIdx,
		sentenceDueAt: progress.sentenceDueAt,
		sentenceIntervalIdx: progress.sentenceIntervalIdx,
		sentenceUnlockedAt: progress.sentenceUnlockedAt,
		lastExampleId: progress.lastExampleId,
		meaningHeavyLapses: progress.meaningHeavyLapses,
		listeningHeavyLapses: progress.listeningHeavyLapses,
		pinyinHeavyLapses: progress.pinyinHeavyLapses,
		sentenceHeavyLapses: progress.sentenceHeavyLapses,
		isStickingPoint: progress.isStickingPoint,
		meaningMarkedKnownAt: progress.meaningMarkedKnownAt,
		listeningMarkedKnownAt: progress.listeningMarkedKnownAt,
		pinyinMarkedKnownAt: progress.pinyinMarkedKnownAt,
		sentenceMarkedKnownAt: progress.sentenceMarkedKnownAt,
		sentenceIntroDayKey: progress.sentenceIntroDayKey,
		sentenceIntroDayCount: progress.sentenceIntroDayCount,
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
		listeningRate: rate(p.listeningCorrect, p.listeningTotal),
		pinyinRate: rate(p.pinyinCorrect, p.pinyinTotal),
		sentenceRate: rate(p.sentenceCorrect, p.sentenceTotal),
		meaningTotal: p.meaningTotal,
		listeningTotal: p.listeningTotal,
		pinyinTotal: p.pinyinTotal,
		sentenceTotal: p.sentenceTotal,
		meaningIntervalIdx: p.meaningIntervalIdx,
		listeningIntervalIdx: p.listeningIntervalIdx,
		pinyinIntervalIdx: p.pinyinIntervalIdx,
		sentenceIntervalIdx: p.sentenceIntervalIdx,
		isStickingPoint: p.isStickingPoint,
	};
}

export async function countDueChannels(userId: string): Promise<number> {
	const activeIds = await getSrsActiveWordIds(userId);
	if (!activeIds.size) return 0;
	const now = new Date();
	const all = await fetchDueCandidateProgress(userId, [...activeIds], now);
	return countDueChannelsForProgressList(all, now);
}

/** Counts (word, channel) pairs due today */
export async function countDueToday(userId: string): Promise<number> {
	return countDueChannels(userId);
}

export { CHANNEL_TO_GROUP, getWeakestChannel };
