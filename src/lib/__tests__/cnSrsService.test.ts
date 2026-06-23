import { describe, it, expect } from 'vitest';
import {
	computeNextReview,
	nextStateFromInterval,
	mergeSubmitItemsInMemory,
	isChannelDue,
} from '@/services/chinese/cnSrsService';
import {
	addDays,
	addMinutes,
	CN_LAPSE_HEAVY_IDX,
	CN_LAPSE_RECALL_IDX,
	CN_SRS_INTERVAL_DAYS,
	CN_STATE_THRESHOLDS,
	CN_WRONG_FIRST_RETRY_MINUTES,
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

	it('MCQ1 correct advances to MCQ2 due tomorrow', () => {
		const next = computeNextReview({ intervalIdx: 0, correct: true, now });
		expect(next.intervalIdx).toBe(1);
		expect(next.state).toBe('learning');
		expect(next.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[1]).getTime());
	});

	it('MCQ2 correct advances to Recall due in 3 days', () => {
		const next = computeNextReview({ intervalIdx: 1, correct: true, now });
		expect(next.intervalIdx).toBe(2);
		expect(next.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[2]).getTime());
	});

	it('Recall correct advances to Maintain due in 7 days', () => {
		const next = computeNextReview({ intervalIdx: 2, correct: true, now });
		expect(next.intervalIdx).toBe(3);
		expect(next.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[3]).getTime());
	});

	it('Maintain correct advances interval tier', () => {
		const next = computeNextReview({ intervalIdx: 3, correct: true, now });
		expect(next.intervalIdx).toBe(4);
		expect(next.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[4]).getTime());
	});

	it('caps at max maintain tier (30 days)', () => {
		const next = computeNextReview({ intervalIdx: 5, correct: true, now });
		expect(next.intervalIdx).toBe(5);
		expect(next.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[5]).getTime());
	});

	it('MCQ1 wrong stays at MCQ1 due in 30 minutes', () => {
		const next = computeNextReview({ intervalIdx: 0, correct: false, now });
		expect(next.intervalIdx).toBe(0);
		expect(next.dueAt.getTime()).toBe(addMinutes(now, CN_WRONG_FIRST_RETRY_MINUTES).getTime());
	});

	it('MCQ2 wrong regresses to MCQ1 due in 30 minutes', () => {
		const next = computeNextReview({ intervalIdx: 1, correct: false, now });
		expect(next.intervalIdx).toBe(0);
		expect(next.dueAt.getTime()).toBe(addMinutes(now, CN_WRONG_FIRST_RETRY_MINUTES).getTime());
	});

	it('Recall wrong regresses to MCQ2 due tomorrow', () => {
		const next = computeNextReview({ intervalIdx: 2, correct: false, now, lapseSeverity: 'light' });
		expect(next.intervalIdx).toBe(1);
		expect(next.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[0]).getTime());
	});

	it('Maintain wrong light lapse regresses to Recall', () => {
		const next = computeNextReview({ intervalIdx: 4, correct: false, now, lapseSeverity: 'light' });
		expect(next.intervalIdx).toBe(CN_LAPSE_RECALL_IDX);
	});

	it('Maintain wrong heavy lapse regresses to MCQ2', () => {
		const next = computeNextReview({ intervalIdx: 4, correct: false, now, lapseSeverity: 'heavy' });
		expect(next.intervalIdx).toBe(CN_LAPSE_HEAVY_IDX);
	});

	it('all channels due for new enrolled word', () => {
		const p = progressFixture({ id: 'p1', userId: 'u1', wordId: 'w-new' });
		expect(isChannelDue(p, 'meaning', now)).toBe(true);
		expect(isChannelDue(p, 'listening', now)).toBe(true);
		expect(isChannelDue(p, 'pinyin', now)).toBe(true);
	});

	it('does not due early before interval expires', () => {
		const future = addDays(now, CN_SRS_INTERVAL_DAYS[3]);
		const p = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			listeningTotal: 5,
			listeningCorrect: 4,
			listeningDueAt: future,
			listeningIntervalIdx: 3,
		});
		expect(isChannelDue(p, 'listening', now)).toBe(false);
	});

	it('reaches mastered state at 30-day threshold', () => {
		expect(nextStateFromInterval(CN_STATE_THRESHOLDS.mastered, true)).toBe('mastered');
		const atThreshold = computeNextReview({
			intervalIdx: CN_STATE_THRESHOLDS.mastered - 1,
			correct: true,
			now,
		});
		expect(atThreshold.intervalIdx).toBe(CN_STATE_THRESHOLDS.mastered);
		expect(atThreshold.state).toBe('mastered');
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

		expect(p.state).toBe('weak');
		expect(p.listeningTotal).toBe(1);
		expect(p.listeningCorrect).toBe(0);
		expect(p.listeningIntervalIdx).toBe(0);
		expect(p.listeningDueAt!.getTime()).toBe(addMinutes(now, CN_WRONG_FIRST_RETRY_MINUTES).getTime());
		expect(p.listeningHeavyLapses).toBe(1);
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
