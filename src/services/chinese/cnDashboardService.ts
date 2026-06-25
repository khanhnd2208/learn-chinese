/* ════════════════════════════════════════════════════════════════════════
   cnDashboardService.ts — Progress & error dashboard
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { rate } from '@/lib/chinese/hanziUtils';
import {
	aggregateDailySeries,
	buildForecast,
	buildUpcomingSchedule,
	computeMaturePct,
	computeStateDistribution,
	computeStreak,
	countDueWordsForMetrics,
	countOverdueChannels,
	findNextDueAt,
	formatNextDueLabel,
	localDayKey,
	startOfLocalDay,
	type ProgressForMetrics,
} from '@/lib/chinese/reviewMetrics';
import { loadWordIdsWithFillExamples } from '@/services/chinese/cnSrsService';
import { ensureEnrollmentForActiveWords, resolveSrsPoolWordIds } from '@/services/chinese/cnSrsEnrollmentService';
import type { CnDashboardDTO } from '@/types/chinese';

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

export async function getChineseDashboard(userId: string): Promise<CnDashboardDTO> {
	const now = new Date();
	const todayStart = startOfLocalDay(now);
	const historySince = new Date(now.getTime() - HISTORY_DAYS * 86_400_000);

	const activeWordIds = await resolveSrsPoolWordIds(userId);
	await ensureEnrollmentForActiveWords(userId, [...activeWordIds]);
	const activeIds = new Set(activeWordIds);

	const [setCount, progress, logs, reviewDayLogs] = await Promise.all([
		prisma.cnWordSet.count({ where: { userId } }),
		prisma.cnWordProgress.findMany({ where: { userId }, include: { word: true } }),
		prisma.cnAnswerLog.findMany({
			where: {
				userId,
				source: { in: ['review', 'mark_known'] },
			},
			orderBy: { createdAt: 'desc' },
			take: 500,
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
	const srsProgress = progress.filter((p) => activeIds.has(p.wordId));
	const wordsWithFillExamples = await loadWordIdsWithFillExamples(
		srsProgress.map((p) => p.wordId),
	);
	const progressMetrics = srsProgress.map(progressToMetrics);
	const overdueCount = countOverdueChannels(progressMetrics, todayStart, wordsWithFillExamples);
	const forecast = buildForecast(progressMetrics, now, 7, wordsWithFillExamples);
	const dueChannelsToday = forecast[0]?.dueCount ?? 0;
	const dueWordsToday = countDueWordsForMetrics(progressMetrics, now, wordsWithFillExamples);
	const upcomingSchedule = buildUpcomingSchedule(progressMetrics, now, wordsWithFillExamples);
	const nextDueAt = dueChannelsToday === 0
		? findNextDueAt(progressMetrics, now, wordsWithFillExamples)
		: null;
	const nextDueLabel = formatNextDueLabel(nextDueAt, now);
	const todayKey = localDayKey(now);
	const reviewedToday = reviewDayLogs.filter((l) => localDayKey(l.createdAt) === todayKey).length;
	const dailySeries = aggregateDailySeries(reviewDayLogs);
	const stateDistribution = computeStateDistribution(progressMetrics);
	const maturePct = computeMaturePct(progressMetrics);

	const activeDayKeys = [...new Set(reviewDayLogs.map((l) => localDayKey(l.createdAt)))];
	const streak = computeStreak(activeDayKeys, now);

	const wordsLearned = srsProgress.filter((p) => p.state !== 'new').length;
	const wordsMastered = srsProgress.filter((p) => p.state === 'mastered').length;
	const weakCount = srsProgress.filter((p) => p.state === 'weak' || p.state === 'learning').length;

	const meaningRate = rate(
		srsProgress.reduce((s, p) => s + p.meaningCorrect, 0),
		srsProgress.reduce((s, p) => s + p.meaningTotal, 0),
	);
	const listeningRate = rate(
		srsProgress.reduce((s, p) => s + p.listeningCorrect, 0),
		srsProgress.reduce((s, p) => s + p.listeningTotal, 0),
	);
	const pinyinRate = rate(
		srsProgress.reduce((s, p) => s + p.pinyinCorrect, 0),
		srsProgress.reduce((s, p) => s + p.pinyinTotal, 0),
	);
	const sentenceRate = rate(
		srsProgress.reduce((s, p) => s + p.sentenceCorrect, 0),
		srsProgress.reduce((s, p) => s + p.sentenceTotal, 0),
	);

	const totalAnswers = logs.length;
	const correctAnswers = logs.filter((l) => l.correct).length;
	const overallRate = rate(correctAnswers, totalAnswers);

	const errorCounts = new Map<string, number>();
	for (const log of logs) {
		if (log.correct || !log.errorType) continue;
		errorCounts.set(log.errorType, (errorCounts.get(log.errorType) ?? 0) + 1);
	}
	const topErrors = [...errorCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([errorType, count]) => ({ errorType: errorType as CnDashboardDTO['topErrors'][0]['errorType'], count }));

	const weakWords = srsProgress
		.filter((p) => p.state === 'weak' || p.state === 'learning')
		.slice(0, 10)
		.map((p) => ({ wordId: p.wordId, simplified: p.word.simplified, state: p.state }));

	return {
		setCount,
		wordsLearned,
		wordsMastered,
		weakCount,
		dueWordsToday,
		dueChannelsToday,
		overdueCount,
		forecast,
		upcomingSchedule,
		nextDueAt: nextDueAt?.toISOString() ?? null,
		nextDueLabel,
		reviewedToday,
		stateDistribution,
		maturePct,
		streak,
		dailySeries,
		overallRate,
		listeningRate,
		pinyinRate,
		sentenceRate,
		meaningRate,
		topErrors,
		weakWords,
	};
}
