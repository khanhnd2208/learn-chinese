import { describe, it, expect } from 'vitest';
import {
	computeNextReview,
	nextStateFromInterval,
	mergeSubmitItemsInMemory,
	isChannelDue,
} from '@/services/chinese/cnSrsService';
import {
	CN_FIRST_WRONG_RETRY_MINUTES,
	CN_LAPSE_FLOOR_IDX,
	CN_SRS_INTERVALS_MINUTES,
	CN_STATE_THRESHOLDS,
} from '@/config/constants';
import type { CnPracticeSubmitItem } from '@/types/chinese';
import type { CnWordProgress } from '@prisma/client';

function progressFixture(overrides: Partial<CnWordProgress> & Pick<CnWordProgress, 'id' | 'userId' | 'wordId'>): CnWordProgress {
	const now = new Date('2026-06-17T10:00:00Z');
	return {
		state: 'learning',
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
		...overrides,
	};
}

describe('cnSrsService', () => {
	const now = new Date('2026-06-17T10:00:00Z');

	it('advances one step on correct answer', () => {
		const next = computeNextReview({ intervalIdx: 0, correct: true, now });
		expect(next.intervalIdx).toBe(1);
		expect(next.state).toBe('learning');
		expect(next.dueAt.getTime()).toBe(now.getTime() + CN_SRS_INTERVALS_MINUTES[1] * 60_000);
	});

	it('always advances one step per correct answer', () => {
		const next = computeNextReview({
			intervalIdx: 0,
			correct: true,
			now,
		});
		expect(next.intervalIdx).toBe(1);
	});

	it('lapses lightly by one step with floor at 1 day', () => {
		const next = computeNextReview({
			intervalIdx: 5,
			correct: false,
			now,
			lapseSeverity: 'light',
		});
		expect(next.intervalIdx).toBe(4);
		expect(next.state).toBe('weak');
		expect(next.dueAt.getTime()).toBe(now.getTime() + CN_SRS_INTERVALS_MINUTES[4] * 60_000);
	});

	it('lapses heavily to floor index (1 day) not 10 minutes', () => {
		const next = computeNextReview({
			intervalIdx: 8,
			correct: false,
			now,
			lapseSeverity: 'heavy',
		});
		expect(next.intervalIdx).toBe(CN_LAPSE_FLOOR_IDX);
		expect(next.dueAt.getTime()).toBe(now.getTime() + CN_SRS_INTERVALS_MINUTES[CN_LAPSE_FLOOR_IDX] * 60_000);
	});

	it('first wrong on channel waits 30 minutes before re-queue', () => {
		const next = computeNextReview({
			intervalIdx: 0,
			correct: false,
			now,
			lapseSeverity: 'heavy',
			isFirstChannelAttempt: true,
		});
		expect(next.intervalIdx).toBe(0);
		expect(next.state).toBe('learning');
		expect(next.dueAt.getTime()).toBe(now.getTime() + CN_FIRST_WRONG_RETRY_MINUTES * 60_000);
	});

	it('isChannelDue respects 30-minute cooldown after first wrong', () => {
		const dueAt = new Date(now.getTime() + CN_FIRST_WRONG_RETRY_MINUTES * 60_000);
		const p = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			state: 'learning',
			meaningIntervalIdx: 1,
			listeningTotal: 1,
			listeningCorrect: 0,
			listeningDueAt: dueAt,
			listeningIntervalIdx: 0,
		});
		expect(isChannelDue(p, 'listening', now)).toBe(false);
		const afterCooldown = new Date(dueAt.getTime() + 1);
		expect(isChannelDue(p, 'listening', afterCooldown)).toBe(true);
	});

	it('first wrong on one channel does not block other channels on same word', () => {
		const cooldownDue = new Date(now.getTime() + CN_FIRST_WRONG_RETRY_MINUTES * 60_000);
		const p = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			state: 'weak',
			dueAt: cooldownDue,
			listeningTotal: 1,
			listeningCorrect: 0,
			listeningDueAt: cooldownDue,
			listeningIntervalIdx: 0,
			meaningTotal: 0,
			meaningDueAt: null,
			pinyinTotal: 0,
			pinyinDueAt: null,
		});
		expect(isChannelDue(p, 'listening', now)).toBe(false);
		expect(isChannelDue(p, 'meaning', now)).toBe(true);
		expect(isChannelDue(p, 'pinyin', now)).toBe(false);
	});

	it('new enrolled word only has meaning due before ramp', () => {
		const p = progressFixture({ id: 'p1', userId: 'u1', wordId: 'w-new' });
		expect(isChannelDue(p, 'meaning', now)).toBe(true);
		expect(isChannelDue(p, 'listening', now)).toBe(false);
		expect(isChannelDue(p, 'pinyin', now)).toBe(false);
	});

	it('opens listening and pinyin after meaning ramp threshold', () => {
		const p = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			meaningIntervalIdx: 1,
			listeningTotal: 0,
			pinyinTotal: 0,
		});
		expect(isChannelDue(p, 'listening', now)).toBe(true);
		expect(isChannelDue(p, 'pinyin', now)).toBe(true);
	});

	it('does not due early for low lifetime rate before interval expires', () => {
		const future = new Date(now.getTime() + CN_SRS_INTERVALS_MINUTES[3] * 60_000);
		const p = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			listeningTotal: 5,
			listeningCorrect: 1,
			listeningDueAt: future,
			listeningIntervalIdx: 3,
		});
		expect(isChannelDue(p, 'listening', now)).toBe(false);
	});

	it('mergeSubmitItemsInMemory applies 30m cooldown only to the failed channel', () => {
		const items: CnPracticeSubmitItem[] = [
			{ wordId: 'w-new', questionType: 'audio_to_meaning', correct: false },
		];
		const { progressByWordId } = mergeSubmitItemsInMemory('u1', items, [], now);
		const p = progressByWordId.get('w-new')!;

		expect(p.listeningDueAt!.getTime()).toBe(now.getTime() + CN_FIRST_WRONG_RETRY_MINUTES * 60_000);
		expect(isChannelDue(p, 'listening', now)).toBe(false);
		expect(isChannelDue(p, 'meaning', now)).toBe(true);
		expect(isChannelDue(p, 'pinyin', now)).toBe(false);
	});

	it('reaches mastered state at 90-day threshold', () => {
		expect(nextStateFromInterval(CN_STATE_THRESHOLDS.mastered, true)).toBe('mastered');
		const atThreshold = computeNextReview({
			intervalIdx: CN_STATE_THRESHOLDS.mastered - 1,
			correct: true,
			now,
		});
		expect(atThreshold.intervalIdx).toBe(CN_STATE_THRESHOLDS.mastered);
		expect(atThreshold.state).toBe('mastered');
	});

	it('can advance beyond old 30-day cap to 90 days', () => {
		const next = computeNextReview({
			intervalIdx: 6,
			correct: true,
			now,
		});
		expect(next.intervalIdx).toBe(7);
		expect(next.dueAt.getTime()).toBe(now.getTime() + CN_SRS_INTERVALS_MINUTES[7] * 60_000);
	});

	it('maps interval indices to states via thresholds', () => {
		expect(nextStateFromInterval(1, true)).toBe('learning');
		expect(nextStateFromInterval(CN_STATE_THRESHOLDS.familiar, true)).toBe('familiar');
		expect(nextStateFromInterval(CN_STATE_THRESHOLDS.strong, true)).toBe('strong');
		expect(nextStateFromInterval(CN_STATE_THRESHOLDS.mastered, true)).toBe('mastered');
	});

	it('mergeSubmitItemsInMemory applies multiple items for same wordId sequentially', () => {
		const existing = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			state: 'learning',
			intervalIdx: 1,
			lastReviewedAt: now,
			meaningCorrect: 2,
			meaningTotal: 3,
			meaningDueAt: now,
			meaningIntervalIdx: 1,
		});

		const items: CnPracticeSubmitItem[] = [
			{ wordId: 'w1', questionType: 'hanzi_to_meaning', correct: true },
			{ wordId: 'w1', questionType: 'hanzi_to_meaning', correct: true },
		];

		const { progressByWordId, answerLogCount } = mergeSubmitItemsInMemory('u1', items, [existing], now);
		const p = progressByWordId.get('w1')!;

		expect(answerLogCount).toBe(2);
		expect(p.meaningTotal).toBe(5);
		expect(p.meaningCorrect).toBe(4);
		expect(p.meaningIntervalIdx).toBe(3);
	});

	it('mergeSubmitItemsInMemory creates new progress for unknown wordId', () => {
		const items: CnPracticeSubmitItem[] = [
			{ wordId: 'w-new', questionType: 'audio_to_meaning', correct: false },
		];
		const { progressByWordId } = mergeSubmitItemsInMemory('u1', items, [], now);
		const p = progressByWordId.get('w-new')!;

		expect(p.state).toBe('learning');
		expect(p.listeningTotal).toBe(1);
		expect(p.listeningCorrect).toBe(0);
		expect(p.listeningIntervalIdx).toBe(0);
		expect(p.listeningDueAt!.getTime()).toBe(now.getTime() + CN_FIRST_WRONG_RETRY_MINUTES * 60_000);
		expect(p.listeningHeavyLapses).toBe(1);
	});

	it('second wrong on channel uses normal lapse floor', () => {
		const existing = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			listeningTotal: 1,
			listeningCorrect: 0,
			listeningDueAt: now,
			listeningIntervalIdx: 0,
		});
		const items: CnPracticeSubmitItem[] = [
			{ wordId: 'w1', questionType: 'audio_to_meaning', correct: false },
		];
		const { progressByWordId } = mergeSubmitItemsInMemory('u1', items, [existing], now);
		const p = progressByWordId.get('w1')!;

		expect(p.listeningIntervalIdx).toBe(CN_LAPSE_FLOOR_IDX);
		expect(p.listeningDueAt!.getTime()).toBe(
			now.getTime() + CN_SRS_INTERVALS_MINUTES[CN_LAPSE_FLOOR_IDX] * 60_000,
		);
	});

	it('mergeSubmitItemsInMemory handles two items for new wordId in one batch', () => {
		const items: CnPracticeSubmitItem[] = [
			{ wordId: 'w-new', questionType: 'hanzi_to_meaning', correct: true },
			{ wordId: 'w-new', questionType: 'hanzi_to_meaning', correct: true },
		];
		const { progressByWordId } = mergeSubmitItemsInMemory('u1', items, [], now);
		const p = progressByWordId.get('w-new')!;

		expect(p.meaningTotal).toBe(2);
		expect(p.meaningCorrect).toBe(2);
		expect(p.meaningIntervalIdx).toBe(2);
	});
});
