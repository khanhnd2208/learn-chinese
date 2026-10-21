/* ════════════════════════════════════════════════════════════════════════
   cnReviewStatsService.ts — SRS progress & session stats
   ════════════════════════════════════════════════════════════════════════ */
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { CN_REVIEW_SECONDS_PER_ITEM } from '@/config/constants';
import { groupLogsIntoSessions } from '@/lib/chinese/groupAnswerSessions';
import { rate } from '@/lib/chinese/hanziUtils';
import {
	avgPerDay,
	buildForecast,
	computeBestStreak,
	computeMaturePct,
	computeStateDistribution,
	computeStreak,
	countDueWordsForMetrics,
	countOverdueChannels,
	findNextDueAt,
	formatNextDueLabel,
	generateReviewInsights,
	localDayKey,
	overduePressureLevel,
	splitRecallAccuracy,
	startOfLocalDay,
	type DailyActivityRow,
	type ProgressForMetrics,
} from '@/lib/chinese/reviewMetrics';
import { resolveSrsPoolWordIds } from '@/services/chinese/cnSrsEnrollmentService';
import { countDueToday, loadWordIdsWithFillExamples } from '@/services/chinese/cnSrsService';
import type { CnErrorType, CnReviewBriefingDTO, CnReviewStatsDTO, CnReviewStatusDTO } from '@/types/chinese';

const HISTORY_DAYS = 90;

function progressToMetrics(p: {
	wordId: string;
	state: ProgressForMetrics['state'];
	meaningIntervalIdx: number;
	soundIntervalIdx: number;
	sentenceIntervalIdx: number;
	meaningDueAt: Date | null;
	soundDueAt: Date | null;
	sentenceDueAt: Date | null;
	meaningCorrect: number;
	meaningTotal: number;
	soundCorrect: number;
	soundTotal: number;
	sentenceCorrect: number;
	sentenceTotal: number;
	dueAt: Date;
	introducedAt: Date | null;
}): ProgressForMetrics {
	return {
		wordId: p.wordId,
		state: p.state,
		meaningIntervalIdx: p.meaningIntervalIdx,
		soundIntervalIdx: p.soundIntervalIdx,
		sentenceIntervalIdx: p.sentenceIntervalIdx,
		meaningDueAt: p.meaningDueAt,
		soundDueAt: p.soundDueAt,
		sentenceDueAt: p.sentenceDueAt,
		meaningCorrect: p.meaningCorrect,
		meaningTotal: p.meaningTotal,
		soundCorrect: p.soundCorrect,
		soundTotal: p.soundTotal,
		sentenceCorrect: p.sentenceCorrect,
		sentenceTotal: p.sentenceTotal,
		dueAt: p.dueAt,
		introducedAt: p.introducedAt,
	};
}

function aggregateDailySeries(
	logs: Array<{ createdAt: Date; correct: boolean }>,
): DailyActivityRow[] {
	const map = new Map<string, { reviewed: number; correct: number }>();
	for (const log of logs) {
		const dayKey = localDayKey(log.createdAt);
		const row = map.get(dayKey) ?? { reviewed: 0, correct: 0 };
		row.reviewed++;
		if (log.correct) row.correct++;
		map.set(dayKey, row);
	}
	return [...map.entries()]
		.map(([dayKey, row]) => ({ dayKey, ...row }))
		.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

async function loadProgressMetrics(
	userId: string,
	activeIds: string[],
): Promise<{ metrics: ProgressForMetrics[]; wordsWithFillExamples: Set<string> }> {
	if (!activeIds.length) return { metrics: [], wordsWithFillExamples: new Set() };
	const [rows, wordsWithFillExamples] = await Promise.all([
		prisma.cnWordProgress.findMany({
			where: { userId, wordId: { in: activeIds } },
			select: {
				wordId: true,
				state: true,
				meaningIntervalIdx: true,
				soundIntervalIdx: true,
				sentenceIntervalIdx: true,
				meaningDueAt: true,
				soundDueAt: true,
				sentenceDueAt: true,
				meaningCorrect: true,
				meaningTotal: true,
				soundCorrect: true,
				soundTotal: true,
				sentenceCorrect: true,
				sentenceTotal: true,
				dueAt: true,
				introducedAt: true,
			},
		}),
		loadWordIdsWithFillExamples(activeIds),
	]);
	return { metrics: rows.map(progressToMetrics), wordsWithFillExamples };
}

export async function getReviewStatus(userId: string): Promise<CnReviewStatusDTO> {
	const now = new Date();
	const [dueTotal, activeWordIds] = await Promise.all([
		countDueToday(userId),
		resolveSrsPoolWordIds(userId),
	]);
	const activeIds = [...activeWordIds];
	const { metrics: progressMetrics, wordsWithFillExamples } = await loadProgressMetrics(userId, activeIds);
	const todayStart = startOfLocalDay(now);
	const overdueCount = countOverdueChannels(progressMetrics, todayStart, wordsWithFillExamples);

	const historySince = new Date(now.getTime() - HISTORY_DAYS * 86_400_000);
	const reviewDayLogs = await prisma.cnAnswerLog.findMany({
		where: {
			userId,
			createdAt: { gte: historySince },
			source: { in: ['review', 'mark_known'] },
		},
		select: { createdAt: true, correct: true },
	});
	const dailySeries = aggregateDailySeries(reviewDayLogs);
	const activeDayKeys = dailySeries.filter((d) => d.reviewed > 0).map((d) => d.dayKey);
	const streak = computeStreak(activeDayKeys, now);

	return {
		dueTotal,
		overdueCount,
		streak,
		pressure: overduePressureLevel(overdueCount),
	};
}

export async function getReviewBriefing(userId: string): Promise<CnReviewBriefingDTO> {
	const now = new Date();
	const todayStart = startOfLocalDay(now);
	const historySince = new Date(now.getTime() - HISTORY_DAYS * 86_400_000);

	const [dueChannels, activeWordIds, todayLogs, historyLogs] = await Promise.all([
		countDueToday(userId),
		resolveSrsPoolWordIds(userId),
		prisma.cnAnswerLog.findMany({
			where: {
				userId,
				createdAt: { gte: todayStart },
				source: { in: ['review', 'mark_known'] },
			},
			select: { correct: true },
		}),
		prisma.cnAnswerLog.findMany({
			where: {
				userId,
				createdAt: { gte: historySince },
				source: { in: ['review', 'mark_known'] },
			},
			select: { createdAt: true, correct: true },
		}),
	]);

	const activeIds = [...activeWordIds];
	const hasActiveWords = activeIds.length > 0;
	const { metrics: progressMetrics, wordsWithFillExamples } = await loadProgressMetrics(userId, activeIds);
	const overdueCount = countOverdueChannels(progressMetrics, todayStart, wordsWithFillExamples);
	const dueWords = countDueWordsForMetrics(progressMetrics, now, wordsWithFillExamples);
	const maturePct = computeMaturePct(progressMetrics, wordsWithFillExamples);

	const channelRows = hasActiveWords
		? await prisma.cnWordProgress.findMany({
			where: { userId, wordId: { in: activeIds } },
			select: {
				meaningCorrect: true,
				meaningTotal: true,
				soundCorrect: true,
				soundTotal: true,
				sentenceCorrect: true,
				sentenceTotal: true,
			},
		})
		: [];

	const dailySeries = aggregateDailySeries(historyLogs);
	const activeDayKeys = dailySeries.filter((d) => d.reviewed > 0).map((d) => d.dayKey);
	const streak = computeStreak(activeDayKeys, now);

	const reviewedToday = todayLogs.length;
	const correctToday = todayLogs.filter((l) => l.correct).length;
	const accuracyToday = rate(correctToday, reviewedToday);

	const forecast = buildForecast(progressMetrics, now, 7, wordsWithFillExamples);
	const meaningRate = rate(
		channelRows.reduce((s, p) => s + p.meaningCorrect, 0),
		channelRows.reduce((s, p) => s + p.meaningTotal, 0),
	);
	const soundRate = rate(
		channelRows.reduce((s, p) => s + p.soundCorrect, 0),
		channelRows.reduce((s, p) => s + p.soundTotal, 0),
	);
	const sentenceRate = rate(
		channelRows.reduce((s, p) => s + p.sentenceCorrect, 0),
		channelRows.reduce((s, p) => s + p.sentenceTotal, 0),
	);

	const insights = generateReviewInsights({
		dueTotal: dueChannels,
		overdueCount,
		streak,
		forecast,
		meaningRate,
		soundRate,
		sentenceRate,
		hasActiveWords,
	});

	const estimatedMinutes = dueChannels > 0
		? Math.max(1, Math.ceil((dueChannels * CN_REVIEW_SECONDS_PER_ITEM) / 60))
		: 0;

	return {
		dueWords,
		dueChannels,
		overdueCount,
		pressure: overduePressureLevel(overdueCount),
		streak,
		reviewedToday,
		accuracyToday,
		maturePct,
		estimatedMinutes,
		hasActiveWords,
		insight: insights[0] ?? 'Sẵn sàng ôn tập — bắt đầu ngay!',
	};
}

export async function getReviewStats(userId: string): Promise<CnReviewStatsDTO> {
	const now = new Date();
	const todayStart = startOfLocalDay(now);
	const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
	const historySince = new Date(now.getTime() - HISTORY_DAYS * 86_400_000);

	const [dueTotal, activeWordIds, todayLogs, weekLogs, historyLogs] = await Promise.all([
		countDueToday(userId),
		resolveSrsPoolWordIds(userId),
		prisma.cnAnswerLog.findMany({
			where: {
				userId,
				createdAt: { gte: todayStart },
				source: { in: ['review', 'mark_known'] },
			},
			orderBy: { createdAt: 'desc' },
			select: { createdAt: true, correct: true, questionType: true, errorType: true },
		}),
		prisma.cnAnswerLog.findMany({
			where: { userId, createdAt: { gte: sevenDaysAgo } },
			orderBy: { createdAt: 'desc' },
			take: 500,
			select: { createdAt: true, correct: true, errorType: true },
		}),
		prisma.cnAnswerLog.findMany({
			where: {
				userId,
				createdAt: { gte: historySince },
				source: { in: ['review', 'mark_known'] },
			},
			select: { createdAt: true, correct: true },
		}),
	]);

	const activeIds = [...activeWordIds];
	const hasActiveWords = activeIds.length > 0;
	const progress = hasActiveWords
		? await prisma.cnWordProgress.findMany({
			where: { userId, wordId: { in: activeIds } },
			include: { word: true },
		})
		: [];

	const progressMetrics = progress.map(progressToMetrics);
	const wordsWithFillExamples = await loadWordIdsWithFillExamples(activeIds);
	const overdueCount = countOverdueChannels(progressMetrics, todayStart, wordsWithFillExamples);
	const forecast = buildForecast(progressMetrics, now, 7, wordsWithFillExamples);
	const nextDueAt = dueTotal === 0 ? findNextDueAt(progressMetrics, now, wordsWithFillExamples) : null;

	const dailySeries = aggregateDailySeries(historyLogs);
	const activeDayKeys = dailySeries.filter((d) => d.reviewed > 0).map((d) => d.dayKey);
	const streak = computeStreak(activeDayKeys, now);
	const bestStreak = computeBestStreak(activeDayKeys);
	const avgPerDay7 = avgPerDay(dailySeries, 7);
	const avgPerDay30 = avgPerDay(dailySeries, 30);

	const reviewedToday = todayLogs.length;
	const correctToday = todayLogs.filter((l) => l.correct).length;
	const accuracyToday = rate(correctToday, reviewedToday);
	const remainingEstimate = Math.max(0, dueTotal);
	const recallSplit = splitRecallAccuracy(todayLogs);

	const weakCount = progress.filter((p) => p.state === 'weak' || p.state === 'learning').length;
	const meaningRate = rate(
		progress.reduce((s, p) => s + p.meaningCorrect, 0),
		progress.reduce((s, p) => s + p.meaningTotal, 0),
	);
	const soundRate = rate(
		progress.reduce((s, p) => s + p.soundCorrect, 0),
		progress.reduce((s, p) => s + p.soundTotal, 0),
	);
	const sentenceRate = rate(
		progress.reduce((s, p) => s + p.sentenceCorrect, 0),
		progress.reduce((s, p) => s + p.sentenceTotal, 0),
	);

	const weakWords = progress
		.filter((p) => p.state === 'weak' || p.state === 'learning')
		.slice(0, 12)
		.map((p) => ({ wordId: p.wordId, simplified: p.word.simplified, state: p.state }));

	const errorCounts = new Map<string, number>();
	for (const log of weekLogs) {
		if (log.correct || !log.errorType) continue;
		errorCounts.set(log.errorType, (errorCounts.get(log.errorType) ?? 0) + 1);
	}
	const topErrors = [...errorCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([errorType, count]) => ({ errorType: errorType as CnErrorType, count }));

	const recentSessions = groupLogsIntoSessions(weekLogs).slice(0, 10);
	const stateDistribution = computeStateDistribution(progressMetrics, wordsWithFillExamples);
	const maturePct = computeMaturePct(progressMetrics, wordsWithFillExamples);

	const insights = generateReviewInsights({
		dueTotal,
		overdueCount,
		streak,
		forecast,
		meaningRate,
		soundRate,
		sentenceRate,
		hasActiveWords,
	});

	return {
		dueTotal,
		overdueCount,
		reviewedToday,
		correctToday,
		accuracyToday,
		remainingEstimate,
		weakCount,
		meaningRate,
		soundRate,
		sentenceRate,
		recallAccuracy: recallSplit.recallAccuracy,
		recallTotal: recallSplit.recallTotal,
		mcqAccuracy: recallSplit.mcqAccuracy,
		mcqTotal: recallSplit.mcqTotal,
		streak,
		bestStreak,
		avgPerDay7,
		avgPerDay30,
		maturePct,
		stateDistribution,
		forecast,
		dailySeries,
		nextDueAt: nextDueAt?.toISOString() ?? null,
		nextDueLabel: formatNextDueLabel(nextDueAt, now),
		insights,
		hasActiveWords,
		weakWords,
		topErrors,
		recentSessions,
	};
}

/** Deduped per-request review status for layout + page composition */
export const getCachedReviewStatus = cache((userId: string) => getReviewStatus(userId));
