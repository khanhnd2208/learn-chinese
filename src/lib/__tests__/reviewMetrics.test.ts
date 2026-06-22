import { describe, expect, it } from 'vitest';
import {
	addLocalDays,
	avgPerDay,
	buildForecast,
	computeBestStreak,
	computeMaturePct,
	computeStreak,
	computeStateDistribution,
	countOverdueChannels,
	findNextDueAt,
	generateReviewInsights,
	localDayKey,
	overduePressureLevel,
	splitRecallAccuracy,
	startOfLocalDay,
} from '@/lib/chinese/reviewMetrics';
import type { ProgressForMetrics } from '@/lib/chinese/reviewMetrics';

function makeProgress(overrides: Partial<ProgressForMetrics> = {}): ProgressForMetrics {
	const now = new Date('2026-06-23T10:00:00');
	return {
		state: 'learning',
		meaningIntervalIdx: 1,
		listeningIntervalIdx: 0,
		pinyinIntervalIdx: 0,
		sentenceIntervalIdx: 0,
		meaningDueAt: now,
		listeningDueAt: now,
		pinyinDueAt: now,
		sentenceDueAt: null,
		dueAt: now,
		...overrides,
	};
}

describe('reviewMetrics', () => {
	it('counts overdue channels before today start', () => {
		const today = startOfLocalDay(new Date('2026-06-23T12:00:00'));
		const yesterday = addLocalDays(today, -1);
		const progress = [
			makeProgress({
				meaningDueAt: yesterday,
				listeningDueAt: today,
				pinyinDueAt: today,
				sentenceDueAt: today,
			}),
		];
		expect(countOverdueChannels(progress, today)).toBe(1);
	});

	it('builds forecast buckets for 7 days', () => {
		const now = new Date('2026-06-23T12:00:00');
		const today = startOfLocalDay(now);
		const tomorrow = addLocalDays(today, 1);
		const progress = [
			makeProgress({
				meaningDueAt: addLocalDays(today, -1),
				listeningDueAt: today,
				pinyinDueAt: tomorrow,
				sentenceDueAt: addLocalDays(today, 2),
			}),
		];
		const forecast = buildForecast(progress, now, 7);
		expect(forecast).toHaveLength(7);
		expect(forecast[0].dueCount).toBe(2);
		expect(forecast[0].overdueCount).toBe(1);
		expect(forecast[1].dueCount).toBe(1);
		expect(forecast[2].dueCount).toBe(1);
	});

	it('finds next due date after now', () => {
		const now = new Date('2026-06-23T12:00:00');
		const future = addLocalDays(now, 2);
		const progress = [
			makeProgress({ meaningDueAt: addLocalDays(now, -1), listeningDueAt: future }),
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
			makeProgress({ state: 'mastered', meaningIntervalIdx: 4, listeningIntervalIdx: 3 }),
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
			listeningRate: 45,
			pinyinRate: 70,
			sentenceRate: 0,
			hasActiveWords: true,
		});
		expect(insights.length).toBeLessThanOrEqual(2);
		expect(insights[0]).toContain('trễ');
	});
});
