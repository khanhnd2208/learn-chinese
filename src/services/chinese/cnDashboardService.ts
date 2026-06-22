/* ════════════════════════════════════════════════════════════════════════
   cnDashboardService.ts — Progress & error dashboard
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { rate } from '@/lib/chinese/hanziUtils';
import { errorTypeLabel } from '@/lib/chinese/errorMapping';
import { countDueToday } from '@/services/chinese/cnSrsService';
import type { CnDashboardDTO } from '@/types/chinese';

export async function getChineseDashboard(userId: string): Promise<CnDashboardDTO> {
	const [setCount, progress, logs, dueToday] = await Promise.all([
		prisma.cnWordSet.count({ where: { userId } }),
		prisma.cnWordProgress.findMany({ where: { userId }, include: { word: true } }),
		prisma.cnAnswerLog.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			take: 500,
		}),
		countDueToday(userId),
	]);

	const wordsLearned = progress.filter((p) => p.state !== 'new').length;
	const wordsMastered = progress.filter((p) => p.state === 'mastered').length;
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

	const weakWords = progress
		.filter((p) => p.state === 'weak' || p.state === 'learning')
		.slice(0, 10)
		.map((p) => ({ wordId: p.wordId, simplified: p.word.simplified, state: p.state }));

	const suggestions: string[] = [];
	if (listeningRate < 60 && listeningRate > 0) {
		suggestions.push('Luyện nghe 5 phút/ngày — bạn đang yếu ở kênh nghe.');
	}
	if (sentenceRate < 60 && sentenceRate > 0) {
		suggestions.push('Làm thêm bài điền câu và mẫu câu với các từ đã học.');
	}
	if (dueToday > 0) {
		suggestions.push(`Hôm nay có ${dueToday} mục ôn (từ × kênh) — bấm "Ôn hôm nay".`);
	}
	if (topErrors.length) {
		suggestions.push(`Lỗi phổ biến: ${errorTypeLabel(topErrors[0].errorType)}.`);
	}
	if (!suggestions.length) {
		suggestions.push('Tiếp tục học bộ từ mới sau mỗi buổi học trên lớp.');
	}

	return {
		setCount,
		wordsLearned,
		wordsMastered,
		weakCount,
		dueToday,
		overallRate,
		listeningRate,
		pinyinRate,
		sentenceRate,
		meaningRate,
		topErrors,
		weakWords,
		suggestions,
	};
}
