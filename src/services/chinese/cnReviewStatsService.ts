/* ════════════════════════════════════════════════════════════════════════
   cnReviewStatsService.ts — SRS progress & session stats
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { groupLogsIntoSessions } from '@/lib/chinese/groupAnswerSessions';
import { rate } from '@/lib/chinese/hanziUtils';
import {
	avgPerDay,
	buildForecast,
	computeBestStreak,
	computeMaturePct,
	computeStateDistribution,
	computeStreak,
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
import type { CnErrorType, CnReviewStatsDTO, CnReviewStatusDTO } from '@/types/chinese';

const HISTORY_DAYS = 90;

function progressToMetrics(p: {
	wordId: string;
	state: ProgressForMetrics['state'];
	meaningIntervalIdx: number;
	listeningIntervalIdx: number;
	pinyinIntervalIdx: number;
	sentenceIntervalIdx: number;
	meaningDueAt: Date | null;
	listeningDueAt: Date | null;
	pinyinDueAt: Date | null;
	sentenceDueAt: Date | null;
	meaningTotal: number;
	listeningTotal: number;
	pinyinTotal: number;
	sentenceTotal: number;
	dueAt: Date;
}): ProgressForMetrics {
	return {
		wordId: p.wordId,
		state: p.state,
		meaningIntervalIdx: p.meaningIntervalIdx,
		listeningIntervalIdx: p.listeningIntervalIdx,
		pinyinIntervalIdx: p.pinyinIntervalIdx,
		sentenceIntervalIdx: p.sentenceIntervalIdx,
		meaningDueAt: p.meaningDueAt,
		listeningDueAt: p.listeningDueAt,
		pinyinDueAt: p.pinyinDueAt,
		sentenceDueAt: p.sentenceDueAt,
		meaningTotal: p.meaningTotal,
		listeningTotal: p.listeningTotal,
		pinyinTotal: p.pinyinTotal,
		sentenceTotal: p.sentenceTotal,
		dueAt: p.dueAt,
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
				listeningIntervalIdx: true,
				pinyinIntervalIdx: true,
				sentenceIntervalIdx: true,
				meaningDueAt: true,
				listeningDueAt: true,
				pinyinDueAt: true,
				sentenceDueAt: true,
				meaningTotal: true,
				listeningTotal: true,
				pinyinTotal: true,
				sentenceTotal: true,
				dueAt: true,
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
	const listeningRate = rate(
		progress.reduce((s, p) => s + p.listeningCorrect, 0),
		progress.reduce((s, p) => s + p.listeningTotal, 0),
	);
	const pinyinRate = rate(
		progress.reduce((s, p) => s + p.pinyinCorrect, 0),
		progress.reduce((s, p) => s + p.pinyinTotal, 0),
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
	const stateDistribution = computeStateDistribution(progressMetrics);
	const maturePct = computeMaturePct(progressMetrics);

	const insights = generateReviewInsights({
		dueTotal,
		overdueCount,
		streak,
		forecast,
		meaningRate,
		listeningRate,
		pinyinRate,
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
		listeningRate,
		pinyinRate,
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
