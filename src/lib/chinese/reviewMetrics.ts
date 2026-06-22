/* ════════════════════════════════════════════════════════════════════════
   reviewMetrics.ts — Pure SRS reporting metrics (no Prisma)
   ════════════════════════════════════════════════════════════════════════ */
import {
	addDays,
	CN_LAPSE_RECALL_IDX,
	CN_SRS_INTERVAL_DAYS,
	CN_STATE_THRESHOLDS,
	clampSrsIntervalIdx,
} from '@/config/constants';
import { isTypedQuestion } from '@/lib/chinese/questionLabels';
import type { CnQuestionType, CnWordProgressState } from '@/types/chinese';

export interface DailyActivityRow {
	dayKey: string;
	reviewed: number;
	correct: number;
}

export interface ForecastDay {
	dayKey: string;
	label: string;
	dueCount: number;
	overdueCount: number;
}

export interface StateDistribution {
	new: number;
	learning: number;
	weak: number;
	familiar: number;
	strong: number;
	mastered: number;
	total: number;
}

export interface ProgressForMetrics {
	state: CnWordProgressState;
	meaningIntervalIdx: number;
	listeningIntervalIdx: number;
	pinyinIntervalIdx: number;
	sentenceIntervalIdx: number;
	meaningDueAt: Date | null;
	listeningDueAt: Date | null;
	pinyinDueAt: Date | null;
	sentenceDueAt: Date | null;
	dueAt: Date;
}

export interface RecallSplit {
	recallAccuracy: number;
	recallTotal: number;
	mcqAccuracy: number;
	mcqTotal: number;
}

export type OverduePressure = 'none' | 'mild' | 'moderate' | 'severe';

const CHANNEL_DUE_FIELDS = [
	'meaningDueAt',
	'listeningDueAt',
	'pinyinDueAt',
	'sentenceDueAt',
] as const satisfies ReadonlyArray<keyof ProgressForMetrics>;

const INTERVAL_FIELDS = [
	'meaningIntervalIdx',
	'listeningIntervalIdx',
	'pinyinIntervalIdx',
	'sentenceIntervalIdx',
] as const satisfies ReadonlyArray<keyof ProgressForMetrics>;

const STATE_ORDER: CnWordProgressState[] = [
	'new',
	'learning',
	'weak',
	'familiar',
	'strong',
	'mastered',
];

const FORECAST_LABELS = ['Hôm nay', 'Mai', 'Ngày kia'] as const;

export function startOfLocalDay(date = new Date()): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function localDayKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function addLocalDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function channelDueDates(progress: ProgressForMetrics): Date[] {
	const fallback = progress.dueAt;
	return CHANNEL_DUE_FIELDS.map((field) => {
		const value = progress[field];
		return value instanceof Date ? value : fallback;
	});
}

export function countOverdueChannels(
	progressList: ProgressForMetrics[],
	todayStart = startOfLocalDay(),
): number {
	let count = 0;
	for (const p of progressList) {
		for (const dueAt of channelDueDates(p)) {
			if (dueAt < todayStart) count++;
		}
	}
	return count;
}

function forecastLabel(dayOffset: number, dayDate: Date): string {
	if (dayOffset < FORECAST_LABELS.length) return FORECAST_LABELS[dayOffset];
	return dayDate.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function buildForecast(
	progressList: ProgressForMetrics[],
	now = new Date(),
	days = 7,
): ForecastDay[] {
	const todayStart = startOfLocalDay(now);
	const buckets: ForecastDay[] = [];

	for (let offset = 0; offset < days; offset++) {
		const dayDate = addLocalDays(todayStart, offset);
		const dayEnd = addLocalDays(dayDate, 1);
		const dayKey = localDayKey(dayDate);
		let dueCount = 0;
		let overdueCount = 0;

		for (const p of progressList) {
			for (const dueAt of channelDueDates(p)) {
				if (offset === 0) {
					if (dueAt < todayStart) {
						overdueCount++;
						dueCount++;
					} else if (dueAt >= todayStart && dueAt < dayEnd) {
						dueCount++;
					}
				} else if (dueAt >= dayDate && dueAt < dayEnd) {
					dueCount++;
				}
			}
		}

		buckets.push({
			dayKey,
			label: forecastLabel(offset, dayDate),
			dueCount,
			overdueCount: offset === 0 ? overdueCount : 0,
		});
	}

	return buckets;
}

export function findNextDueAt(
	progressList: ProgressForMetrics[],
	now = new Date(),
): Date | null {
	let next: Date | null = null;
	for (const p of progressList) {
		for (const dueAt of channelDueDates(p)) {
			if (dueAt <= now) continue;
			if (!next || dueAt < next) next = dueAt;
		}
	}
	return next;
}

export function computeStreak(activeDayKeys: string[], now = new Date()): number {
	if (!activeDayKeys.length) return 0;
	const active = new Set(activeDayKeys);
	let streak = 0;
	let cursor = startOfLocalDay(now);

	while (active.has(localDayKey(cursor))) {
		streak++;
		cursor = addLocalDays(cursor, -1);
	}

	return streak;
}

export function computeBestStreak(activeDayKeys: string[]): number {
	if (!activeDayKeys.length) return 0;
	const sorted = [...new Set(activeDayKeys)].sort();
	let best = 1;
	let current = 1;

	for (let i = 1; i < sorted.length; i++) {
		const prev = new Date(`${sorted[i - 1]}T12:00:00`);
		const curr = new Date(`${sorted[i]}T12:00:00`);
		const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
		if (diffDays === 1) {
			current++;
			best = Math.max(best, current);
		} else {
			current = 1;
		}
	}

	return best;
}

export function avgPerDay(dailySeries: DailyActivityRow[], days: number): number {
	if (!dailySeries.length || days <= 0) return 0;
	const cutoff = addLocalDays(startOfLocalDay(), -(days - 1));
	const cutoffKey = localDayKey(cutoff);
	const total = dailySeries
		.filter((row) => row.dayKey >= cutoffKey)
		.reduce((sum, row) => sum + row.reviewed, 0);
	return Math.round((total / days) * 10) / 10;
}

export function computeStateDistribution(progressList: ProgressForMetrics[]): StateDistribution {
	const dist: StateDistribution = {
		new: 0,
		learning: 0,
		weak: 0,
		familiar: 0,
		strong: 0,
		mastered: 0,
		total: progressList.length,
	};

	for (const p of progressList) {
		if (STATE_ORDER.includes(p.state)) {
			dist[p.state]++;
		}
	}

	return dist;
}

export function computeMaturePct(progressList: ProgressForMetrics[]): number {
	if (!progressList.length) return 0;
	const matureThreshold = CN_STATE_THRESHOLDS.familiar;
	let mature = 0;

	for (const p of progressList) {
		const isMature = INTERVAL_FIELDS.some((field) => (p[field] as number) >= matureThreshold);
		if (isMature) mature++;
	}

	return Math.round((mature / progressList.length) * 100);
}

export function splitRecallAccuracy(
	logs: Array<{ questionType: CnQuestionType; correct: boolean }>,
): RecallSplit {
	let recallCorrect = 0;
	let recallTotal = 0;
	let mcqCorrect = 0;
	let mcqTotal = 0;

	for (const log of logs) {
		if (isTypedQuestion(log.questionType)) {
			recallTotal++;
			if (log.correct) recallCorrect++;
		} else {
			mcqTotal++;
			if (log.correct) mcqCorrect++;
		}
	}

	return {
		recallAccuracy: recallTotal ? Math.round((recallCorrect / recallTotal) * 100) : 0,
		recallTotal,
		mcqAccuracy: mcqTotal ? Math.round((mcqCorrect / mcqTotal) * 100) : 0,
		mcqTotal,
	};
}

export function overduePressureLevel(overdueCount: number): OverduePressure {
	if (overdueCount <= 0) return 'none';
	if (overdueCount <= 5) return 'mild';
	if (overdueCount <= 15) return 'moderate';
	return 'severe';
}

export interface ReviewInsightInput {
	dueTotal: number;
	overdueCount: number;
	streak: number;
	forecast: ForecastDay[];
	meaningRate: number;
	listeningRate: number;
	pinyinRate: number;
	sentenceRate: number;
	hasActiveWords: boolean;
}

export function generateReviewInsights(input: ReviewInsightInput): string[] {
	const insights: string[] = [];
	const {
		dueTotal,
		overdueCount,
		streak,
		forecast,
		meaningRate,
		listeningRate,
		pinyinRate,
		sentenceRate,
		hasActiveWords,
	} = input;

	if (!hasActiveWords) {
		return ['Bật Ôn SRS trên một bộ từ để bắt đầu theo dõi tiến độ.'];
	}

	if (overdueCount > 0) {
		insights.push(`${overdueCount} mục đang trễ — ôn sớm để tránh quên.`);
	}

	const tomorrow = forecast[1];
	const today = forecast[0];
	if (tomorrow && today && tomorrow.dueCount > 0) {
		const avgTodayDone = today.dueCount > 0 ? today.dueCount : 1;
		if (tomorrow.dueCount >= avgTodayDone * 1.5) {
			insights.push(`Mai có ~${tomorrow.dueCount} mục — làm trước hôm nay cho nhẹ.`);
		}
	}

	const channels = [
		{ label: 'Nghe', rate: listeningRate },
		{ label: 'Pinyin', rate: pinyinRate },
		{ label: 'Nghĩa', rate: meaningRate },
		{ label: 'Dùng câu', rate: sentenceRate },
	];
	const practiced = channels.filter((c) => c.rate > 0);
	if (practiced.length >= 2) {
		const weakest = [...practiced].sort((a, b) => a.rate - b.rate)[0];
		if (weakest.rate < 60) {
			insights.push(`Kênh ${weakest.label} đang yếu (${weakest.rate}%) — ưu tiên luyện thêm.`);
		}
	}

	if (streak >= 3) {
		insights.push(`${streak} ngày liên tiếp — giữ phong độ!`);
	}

	if (!insights.length && dueTotal === 0) {
		insights.push('Tất cả trong tầm kiểm soát. Tiếp tục học bộ từ mới khi sẵn sàng.');
	} else if (!insights.length && dueTotal > 0) {
		insights.push(`Hôm nay có ${dueTotal} mục cần ôn — bấm "Ôn ngay".`);
	}

	return insights.slice(0, 2);
}

export function formatNextDueLabel(nextDueAt: Date | null, now = new Date()): string | null {
	if (!nextDueAt) return null;
	const diffMs = nextDueAt.getTime() - now.getTime();
	if (diffMs <= 0) return null;

	const diffHours = Math.round(diffMs / 3_600_000);
	if (diffHours < 24) {
		return `Mục tiếp theo sau ~${diffHours} giờ`;
	}
	const diffDays = Math.round(diffMs / 86_400_000);
	return `Mục tiếp theo sau ~${diffDays} ngày`;
}

export function formatReviewScheduleLabel(
	intervalIdx: number | undefined,
	correct: boolean,
	now = new Date(),
): string | null {
	if (intervalIdx === undefined) return null;
	const idx = clampSrsIntervalIdx(intervalIdx);

	let nextIdx: number;
	let dueAt: Date;

	if (!correct) {
		if (idx <= 0) nextIdx = 0;
		else if (idx === 1) nextIdx = 0;
		else if (idx === 2) nextIdx = 1;
		else nextIdx = CN_LAPSE_RECALL_IDX;
		dueAt = addDays(now, CN_SRS_INTERVAL_DAYS[0]);
	} else {
		nextIdx = Math.min(idx + 1, CN_SRS_INTERVAL_DAYS.length - 1);
		dueAt = addDays(now, CN_SRS_INTERVAL_DAYS[nextIdx]);
	}

	const days = Math.max(1, Math.round((dueAt.getTime() - now.getTime()) / 86_400_000));
	void nextIdx;
	return correct ? `Gặp lại sau ${days} ngày` : `Hẹn lại sau ${days} ngày`;
}
