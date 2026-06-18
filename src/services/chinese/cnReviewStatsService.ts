/* ════════════════════════════════════════════════════════════════════════
   cnReviewStatsService.ts — SRS progress & session stats
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { groupLogsIntoSessions } from '@/lib/chinese/groupAnswerSessions';
import { rate } from '@/lib/chinese/hanziUtils';
import { countDueToday } from '@/services/chinese/cnSrsService';
import type { CnReviewStatsDTO } from '@/types/chinese';

function startOfLocalDay(date = new Date()): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

export async function getReviewStats(userId: string): Promise<CnReviewStatsDTO> {
	const now = new Date();
	const todayStart = startOfLocalDay(now);
	const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

	const [dueTotal, progress, todayLogs, weekLogs] = await Promise.all([
		countDueToday(userId),
		prisma.cnWordProgress.findMany({
			where: { userId },
			include: { word: true },
		}),
		prisma.cnAnswerLog.findMany({
			where: { userId, createdAt: { gte: todayStart } },
			orderBy: { createdAt: 'desc' },
		}),
		prisma.cnAnswerLog.findMany({
			where: { userId, createdAt: { gte: sevenDaysAgo } },
			orderBy: { createdAt: 'desc' },
			take: 500,
		}),
	]);

	const reviewedToday = todayLogs.length;
	const correctToday = todayLogs.filter((l) => l.correct).length;
	const accuracyToday = rate(correctToday, reviewedToday);
	const remainingEstimate = Math.max(0, dueTotal);

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
	const charRate = rate(
		progress.reduce((s, p) => s + p.charCorrect, 0),
		progress.reduce((s, p) => s + p.charTotal, 0),
	);

	const weakWords = progress
		.filter((p) => p.state === 'weak' || p.state === 'learning')
		.slice(0, 12)
		.map((p) => ({ wordId: p.wordId, simplified: p.word.simplified, state: p.state }));

	const recentSessions = groupLogsIntoSessions(weekLogs).slice(0, 10);

	return {
		dueTotal,
		reviewedToday,
		correctToday,
		accuracyToday,
		remainingEstimate,
		weakCount,
		meaningRate,
		listeningRate,
		pinyinRate,
		sentenceRate,
		charRate,
		weakWords,
		recentSessions,
	};
}
