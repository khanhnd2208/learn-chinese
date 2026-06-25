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
import { ALL_SKILL_CHANNELS, type SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import { isTypedQuestion } from '@/lib/chinese/questionLabels';
import type { CnWordProgressState } from '@/types/chinese';

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

export interface UpcomingSlotDTO {
	key: string;
	label: string;
	count: number;
	overdueCount?: number;
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
	wordId?: string;
	state: CnWordProgressState;
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

const CHANNEL_TOTAL_FIELDS: Record<SkillChannel, keyof ProgressForMetrics> = {
	meaning: 'meaningTotal',
	listening: 'listeningTotal',
	pinyin: 'pinyinTotal',
	sentence: 'sentenceTotal',
};

const CHANNELS_BY_DUE_FIELD: Record<typeof CHANNEL_DUE_FIELDS[number], SkillChannel> = {
	meaningDueAt: 'meaning',
	listeningDueAt: 'listening',
	pinyinDueAt: 'pinyin',
	sentenceDueAt: 'sentence',
};

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

function channelDueAt(progress: ProgressForMetrics, channel: SkillChannel): Date {
	const field = `${channel}DueAt` as keyof ProgressForMetrics;
	const value = progress[field];
	return value instanceof Date ? value : progress.dueAt;
}

function isSentenceChannelEligible(
	progress: ProgressForMetrics,
	wordsWithFillExamples?: Set<string>,
): boolean {
	if (!wordsWithFillExamples || !progress.wordId) return true;
	return wordsWithFillExamples.has(progress.wordId);
}

/** Mirrors cnSrsService.isChannelDue for dashboard/stats parity */
export function isChannelDueForMetrics(
	progress: ProgressForMetrics,
	channel: SkillChannel,
	now: Date,
	wordsWithFillExamples?: Set<string>,
): boolean {
	if (channel === 'sentence' && !isSentenceChannelEligible(progress, wordsWithFillExamples)) {
		return false;
	}
	const total = progress[CHANNEL_TOTAL_FIELDS[channel]] as number;
	if (total === 0) return true;
	return channelDueAt(progress, channel) <= now;
}

export function countDueChannelsForMetrics(
	progressList: ProgressForMetrics[],
	now = new Date(),
	wordsWithFillExamples?: Set<string>,
): number {
	let count = 0;
	for (const p of progressList) {
		for (const ch of ALL_SKILL_CHANNELS) {
			if (isChannelDueForMetrics(p, ch, now, wordsWithFillExamples)) count++;
		}
	}
	return count;
}

/** Unique words with at least one due channel today */
export function countDueWordsForMetrics(
	progressList: ProgressForMetrics[],
	now = new Date(),
	wordsWithFillExamples?: Set<string>,
): number {
	return progressList.filter((p) =>
		ALL_SKILL_CHANNELS.some((ch) => isChannelDueForMetrics(p, ch, now, wordsWithFillExamples)),
	).length;
}

export function aggregateDailySeries(
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

export function countOverdueChannels(
	progressList: ProgressForMetrics[],
	todayStart = startOfLocalDay(),
	wordsWithFillExamples?: Set<string>,
): number {
	let count = 0;
	for (const p of progressList) {
		for (const ch of ALL_SKILL_CHANNELS) {
			if (ch === 'sentence' && !isSentenceChannelEligible(p, wordsWithFillExamples)) continue;
			const total = p[CHANNEL_TOTAL_FIELDS[ch]] as number;
			if (total === 0) continue;
			if (channelDueAt(p, ch) < todayStart) count++;
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
	wordsWithFillExamples?: Set<string>,
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
			for (const ch of ALL_SKILL_CHANNELS) {
				if (ch === 'sentence' && !isSentenceChannelEligible(p, wordsWithFillExamples)) continue;
				const total = p[CHANNEL_TOTAL_FIELDS[ch]] as number;
				const dueAt = channelDueAt(p, ch);

				if (offset === 0) {
					if (total === 0) {
						dueCount++;
						continue;
					}
					if (dueAt < todayStart) {
						overdueCount++;
						dueCount++;
					} else if (dueAt >= todayStart && dueAt < dayEnd) {
						dueCount++;
					}
				} else if (total > 0 && dueAt >= dayDate && dueAt < dayEnd) {
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

const UPCOMING_SLOT_ORDER = ['now', 'in30m', 'in2h', 'today', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6'] as const;

export function buildUpcomingSchedule(
	progressList: ProgressForMetrics[],
	now = new Date(),
	wordsWithFillExamples?: Set<string>,
): UpcomingSlotDTO[] {
	const todayStart = startOfLocalDay(now);
	const todayEnd = addLocalDays(todayStart, 1);
	const in30m = new Date(now.getTime() + 30 * 60_000);
	const in2h = new Date(now.getTime() + 2 * 60 * 60_000);

	const slotMap = new Map<string, { label: string; count: number; overdueCount: number }>();

	const ensureSlot = (key: string, label: string) => {
		let row = slotMap.get(key);
		if (!row) {
			row = { label, count: 0, overdueCount: 0 };
			slotMap.set(key, row);
		}
		return row;
	};

	ensureSlot('now', 'Ngay bây giờ');
	ensureSlot('in30m', 'Sau 30 phút');
	ensureSlot('in2h', 'Sau 2 giờ');
	ensureSlot('today', 'Còn lại hôm nay');
	for (let offset = 1; offset <= 6; offset++) {
		const dayDate = addLocalDays(todayStart, offset);
		ensureSlot(`day-${offset}`, forecastLabel(offset, dayDate));
	}

	for (const p of progressList) {
		for (const ch of ALL_SKILL_CHANNELS) {
			if (ch === 'sentence' && !isSentenceChannelEligible(p, wordsWithFillExamples)) continue;
			const total = p[CHANNEL_TOTAL_FIELDS[ch]] as number;
			const dueAt = channelDueAt(p, ch);

			if (total === 0) {
				ensureSlot('now', 'Ngay bây giờ').count++;
				continue;
			}

			if (dueAt <= now) {
				const slot = ensureSlot('now', 'Ngay bây giờ');
				slot.count++;
				if (dueAt < todayStart) slot.overdueCount++;
				continue;
			}

			if (dueAt <= in30m) {
				ensureSlot('in30m', 'Sau 30 phút').count++;
				continue;
			}

			if (dueAt <= in2h) {
				ensureSlot('in2h', 'Sau 2 giờ').count++;
				continue;
			}

			if (dueAt < todayEnd) {
				ensureSlot('today', 'Còn lại hôm nay').count++;
				continue;
			}

			for (let offset = 1; offset <= 6; offset++) {
				const dayDate = addLocalDays(todayStart, offset);
				const dayEnd = addLocalDays(dayDate, 1);
				if (dueAt >= dayDate && dueAt < dayEnd) {
					ensureSlot(`day-${offset}`, forecastLabel(offset, dayDate)).count++;
					break;
				}
			}
		}
	}

	return UPCOMING_SLOT_ORDER.map((key) => {
		const row = slotMap.get(key);
		if (!row) return { key, label: key, count: 0 };
		return {
			key,
			label: row.label,
			count: row.count,
			...(key === 'now' && row.overdueCount > 0 ? { overdueCount: row.overdueCount } : {}),
		};
	});
}

export function findNextDueAt(
	progressList: ProgressForMetrics[],
	now = new Date(),
	wordsWithFillExamples?: Set<string>,
): Date | null {
	let next: Date | null = null;
	for (const p of progressList) {
		for (const field of CHANNEL_DUE_FIELDS) {
			const ch = CHANNELS_BY_DUE_FIELD[field];
			if (ch === 'sentence' && !isSentenceChannelEligible(p, wordsWithFillExamples)) continue;
			const total = p[CHANNEL_TOTAL_FIELDS[ch]] as number;
			if (total === 0) continue;
			const dueAt = channelDueAt(p, ch);
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
	logs: Array<{ questionType: string; correct: boolean }>,
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

	const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
	if (diffMinutes < 60) {
		return `Mục tiếp theo sau ~${diffMinutes} phút`;
	}

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
