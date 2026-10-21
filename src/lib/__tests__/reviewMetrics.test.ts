import { describe, expect, it } from 'vitest';
import {
	addLocalDays,
	avgPerDay,
	buildForecast,
	buildUpcomingSchedule,
	computeBestStreak,
	computeMaturePct,
	computeStreak,
	computeStateDistribution,
	countDueChannelsForMetrics,
	countDueWordsForMetrics,
	countOverdueChannels,
	findNextDueAt,
	formatNextDueLabel,
	formatReviewScheduleLabel,
	generateReviewInsights,
	isChannelDueForMetrics,
	localDayKey,
	overduePressureLevel,
	splitRecallAccuracy,
	startOfLocalDay,
} from '@/lib/chinese/reviewMetrics';
import type { ProgressForMetrics } from '@/lib/chinese/reviewMetrics';

function makeProgress(overrides: Partial<ProgressForMetrics> = {}): ProgressForMetrics {
	const now = new Date('2026-06-23T10:00:00');
	return {
		wordId: 'w1',
		state: 'learning',
		meaningIntervalIdx: 1,
		soundIntervalIdx: 0,
		sentenceIntervalIdx: 0,
		meaningDueAt: now,
		soundDueAt: now,
		sentenceDueAt: null,
		meaningTotal: 1,
		soundTotal: 1,
		sentenceTotal: 0,
		dueAt: now,
		...overrides,
	};
}

describe('reviewMetrics', () => {
	it('counts overdue channels before today start (practiced channels only)', () => {
		const today = startOfLocalDay(new Date('2026-06-23T12:00:00'));
		const yesterday = addLocalDays(today, -1);
		const progress = [
			makeProgress({
				meaningDueAt: yesterday,
				soundDueAt: today,
				sentenceDueAt: today,
				meaningTotal: 1,
				soundTotal: 1,
				sentenceTotal: 0,
			}),
		];
		expect(countOverdueChannels(progress, today)).toBe(1);
	});

	it('excludes sentence channel without fill examples from metrics', () => {
		const now = new Date('2026-06-23T12:00:00');
		const progress = [makeProgress({ sentenceTotal: 0, sentenceDueAt: now })];
		const withExamples = new Set<string>();
		expect(countDueChannelsForMetrics(progress, now, withExamples)).toBe(2);
		expect(countDueChannelsForMetrics(progress, now, new Set(['w1']))).toBe(3);
	});

	it('counts unique due words separately from due channels', () => {
		const now = new Date('2026-06-23T12:00:00');
		const future = addLocalDays(now, 1);
		const progress = [
			makeProgress({ wordId: 'w1' }),
			makeProgress({
				wordId: 'w2',
				meaningTotal: 2,
				meaningDueAt: future,
				soundTotal: 2,
				soundDueAt: future,
				sentenceTotal: 1,
				sentenceDueAt: future,
			}),
		];
		expect(countDueWordsForMetrics(progress, now)).toBe(1);
		expect(countDueChannelsForMetrics(progress, now)).toBe(3);
	});

	it('forecast today matches countDueChannelsForMetrics', () => {
		const now = new Date('2026-06-23T12:00:00');
		const today = startOfLocalDay(now);
		const progress = [
			makeProgress({
				meaningDueAt: addLocalDays(today, -1),
				soundDueAt: addLocalDays(today, 1),
				sentenceDueAt: addLocalDays(today, 2),
				sentenceTotal: 1,
			}),
			makeProgress({
				wordId: 'w2',
				sentenceTotal: 0,
				sentenceDueAt: today,
			}),
		];
		const wordsWithFillExamples = new Set(['w1']);
		const forecast = buildForecast(progress, now, 7, wordsWithFillExamples);
		const dueNow = countDueChannelsForMetrics(progress, now, wordsWithFillExamples);
		expect(forecast[0].dueCount).toBe(dueNow);
	});

	it('builds forecast buckets for 7 days', () => {
		const now = new Date('2026-06-23T12:00:00');
		const today = startOfLocalDay(now);
		const progress = [
			makeProgress({
				meaningDueAt: addLocalDays(today, -1),
				soundDueAt: today,
				sentenceDueAt: addLocalDays(today, 2),
				meaningTotal: 1,
				soundTotal: 1,
				sentenceTotal: 1,
			}),
		];
		const forecast = buildForecast(progress, now, 7);
		expect(forecast).toHaveLength(7);
		expect(forecast[0].dueCount).toBe(2);
		expect(forecast[0].overdueCount).toBe(1);
		expect(forecast[1].dueCount).toBe(0);
		expect(forecast[2].dueCount).toBe(1);
	});

	it('isChannelDueForMetrics mirrors SRS due rules', () => {
		const now = new Date('2026-06-23T12:00:00');
		const future = addLocalDays(now, 1);
		const p = makeProgress({ meaningTotal: 0, meaningDueAt: future });
		expect(isChannelDueForMetrics(p, 'meaning', now)).toBe(true);
		const practiced = makeProgress({ meaningTotal: 2, meaningDueAt: future });
		expect(isChannelDueForMetrics(practiced, 'meaning', now)).toBe(false);
	});

	it('finds next due date after now', () => {
		const now = new Date('2026-06-23T12:00:00');
		const future = addLocalDays(now, 2);
		const progress = [
			makeProgress({ meaningDueAt: addLocalDays(now, -1), soundDueAt: future, soundTotal: 1 }),
		];
		expect(findNextDueAt(progress, now)?.getTime()).toBe(future.getTime());
	});

	it('computes streak from consecutive day keys', () => {
		const now = new Date('2026-06-23T12:00:00');
		const keys = [
			localDayKey(now),
			localDayKey(addLocalDays(now, -1)),
			localDayKey(addLocalDays(now, -2)),
		];
		expect(computeStreak(keys, now)).toBe(3);
		expect(computeStreak([localDayKey(addLocalDays(now, -1))], now)).toBe(0);
	});

	it('computes best streak across gaps', () => {
		const keys = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-10', '2026-06-11'];
		expect(computeBestStreak(keys)).toBe(3);
	});

	it('averages reviews per day over window', () => {
		const today = localDayKey(new Date());
		const yesterday = localDayKey(addLocalDays(new Date(), -1));
		const series = [
			{ dayKey: today, reviewed: 10, correct: 8 },
			{ dayKey: yesterday, reviewed: 6, correct: 5 },
		];
		expect(avgPerDay(series, 7)).toBe(2.3);
	});

	it('computes state distribution and mature percent', () => {
		const progress = [
			makeProgress({ state: 'new', meaningIntervalIdx: 0 }),
			makeProgress({ state: 'mastered', meaningIntervalIdx: 4, soundIntervalIdx: 3 }),
		];
		const dist = computeStateDistribution(progress);
		expect(dist.new).toBe(1);
		expect(dist.mastered).toBe(1);
		expect(computeMaturePct(progress)).toBe(50);
	});

	it('splits recall vs mcq accuracy', () => {
		const split = splitRecallAccuracy([
			{ questionType: 'meaning_to_hanzi_typed', correct: true },
			{ questionType: 'meaning_to_hanzi_typed', correct: false },
			{ questionType: 'hanzi_to_meaning', correct: true },
		]);
		expect(split.recallTotal).toBe(2);
		expect(split.recallAccuracy).toBe(50);
		expect(split.mcqTotal).toBe(1);
		expect(split.mcqAccuracy).toBe(100);
	});

	it('maps overdue pressure levels', () => {
		expect(overduePressureLevel(0)).toBe('none');
		expect(overduePressureLevel(3)).toBe('mild');
		expect(overduePressureLevel(10)).toBe('moderate');
		expect(overduePressureLevel(20)).toBe('severe');
	});

	it('generates prioritized insights', () => {
		const insights = generateReviewInsights({
			dueTotal: 12,
			overdueCount: 4,
			streak: 5,
			forecast: [
				{ dayKey: 'a', label: 'Hôm nay', dueCount: 12, overdueCount: 4 },
				{ dayKey: 'b', label: 'Mai', dueCount: 30, overdueCount: 0 },
			],
			meaningRate: 80,
			soundRate: 45,
			sentenceRate: 0,
			hasActiveWords: true,
		});
		expect(insights.length).toBeLessThanOrEqual(2);
		expect(insights[0]).toContain('trễ');
	});

	it('builds upcoming schedule with intraday buckets', () => {
		const now = new Date('2026-06-23T12:00:00');
		const future = addLocalDays(now, 10);
		const in20m = new Date(now.getTime() + 20 * 60_000);
		const in1h = new Date(now.getTime() + 60 * 60_000);
		const laterToday = new Date('2026-06-23T20:00:00');
		const tomorrow = addLocalDays(startOfLocalDay(now), 1);
		const idle = {
			meaningDueAt: future,
			soundDueAt: future,
			sentenceDueAt: future,
			meaningTotal: 1,
			soundTotal: 1,
			sentenceTotal: 1,
		};
		const progress = [
			makeProgress({
				...idle,
				meaningDueAt: addLocalDays(startOfLocalDay(now), -1),
				meaningTotal: 2,
			}),
			makeProgress({
				wordId: 'w2',
				...idle,
				soundDueAt: in20m,
			}),
			makeProgress({
				wordId: 'w3',
				...idle,
				soundDueAt: in1h,
			}),
			makeProgress({
				wordId: 'w4',
				...idle,
				sentenceDueAt: laterToday,
			}),
			makeProgress({
				wordId: 'w5',
				...idle,
				meaningDueAt: tomorrow,
			}),
		];
		const schedule = buildUpcomingSchedule(progress, now, new Set(['w4']));
		const byKey = Object.fromEntries(schedule.map((s) => [s.key, s]));
		expect(byKey.now?.count).toBe(1);
		expect(byKey.now?.overdueCount).toBe(1);
		expect(byKey.in30m?.count).toBe(1);
		expect(byKey.in2h?.count).toBe(1);
		expect(byKey.today?.count).toBe(1);
		expect(byKey['day-1']?.count).toBe(1);
	});

	it('formatNextDueLabel shows minutes under one hour', () => {
		const now = new Date('2026-06-23T12:00:00');
		const in30m = new Date(now.getTime() + 30 * 60_000);
		expect(formatNextDueLabel(in30m, now)).toBe('Mục tiếp theo sau ~30 phút');
	});

	it('formatReviewScheduleLabel matches the shared schedule for wrong MCQ and correct recall', () => {
		const now = new Date('2026-06-17T10:00:00Z');
		expect(formatReviewScheduleLabel(0, false, now)).toContain('30 phút');
		expect(formatReviewScheduleLabel(1, false, now)).toContain('30 phút');
		expect(formatReviewScheduleLabel(2, false, now)).toContain('1 ngày');
		expect(formatReviewScheduleLabel(2, true, now)).toContain('7 ngày');
		expect(formatReviewScheduleLabel(3, true, now, { hintUsed: true })).toBe('Gặp lại sau 1 ngày');
	});
});
