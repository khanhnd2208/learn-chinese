import { describe, it, expect } from 'vitest';
import {
	computeNextReview,
	nextStateFromInterval,
	mergeSubmitItemsInMemory,
} from '@/services/chinese/cnSrsService';
import {
	CN_LAPSE_FLOOR_IDX,
	CN_SRS_INTERVALS_MINUTES,
	CN_STATE_THRESHOLDS,
} from '@/config/constants';
import type { CnPracticeSubmitItem } from '@/types/chinese';
import type { CnWordProgress } from '@prisma/client';

describe('cnSrsService', () => {
	const now = new Date('2026-06-17T10:00:00Z');

	it('advances one step on correct MCQ answer regardless of confidence', () => {
		const next = computeNextReview({ intervalIdx: 0, correct: true, now, confidence: 1.0, isProduction: false });
		expect(next.intervalIdx).toBe(1);
		expect(next.state).toBe('learning');
		expect(next.dueAt.getTime()).toBe(now.getTime() + CN_SRS_INTERVALS_MINUTES[1] * 60_000);
	});

	it('advances two steps on correct production answer with high confidence', () => {
		const next = computeNextReview({
			intervalIdx: 0,
			correct: true,
			now,
			confidence: 1.0,
			isProduction: true,
		});
		expect(next.intervalIdx).toBe(2);
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

	it('reaches mastered state at 90-day threshold and can extend further', () => {
		expect(nextStateFromInterval(CN_STATE_THRESHOLDS.mastered, true)).toBe('mastered');
		const atThreshold = computeNextReview({
			intervalIdx: CN_STATE_THRESHOLDS.mastered - 2,
			correct: true,
			now,
			confidence: 1.0,
			isProduction: true,
		});
		expect(atThreshold.intervalIdx).toBe(CN_STATE_THRESHOLDS.mastered);
		expect(atThreshold.state).toBe('mastered');
	});

	it('can advance beyond old 30-day cap to 90 days', () => {
		const next = computeNextReview({
			intervalIdx: 5,
			correct: true,
			now,
			confidence: 1.0,
			isProduction: true,
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
		const now = new Date('2026-06-17T10:00:00Z');
		const existing: CnWordProgress = {
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			state: 'learning',
			dueAt: now,
			intervalIdx: 1,
			lastReviewedAt: now,
			meaningCorrect: 2,
			meaningTotal: 3,
			listeningCorrect: 0,
			listeningTotal: 0,
			pinyinCorrect: 0,
			pinyinTotal: 0,
			sentenceCorrect: 0,
			sentenceTotal: 0,
			charCorrect: 0,
			charTotal: 0,
			meaningDueAt: now,
			meaningIntervalIdx: 1,
			listeningDueAt: null,
			listeningIntervalIdx: 0,
			pinyinDueAt: null,
			pinyinIntervalIdx: 0,
			sentenceDueAt: null,
			sentenceIntervalIdx: 0,
			hanziDueAt: null,
			hanziIntervalIdx: 0,
			createdAt: now,
			updatedAt: now,
		};

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
		const now = new Date('2026-06-17T10:00:00Z');
		const items: CnPracticeSubmitItem[] = [
			{ wordId: 'w-new', questionType: 'audio_to_meaning', correct: false },
		];
		const { progressByWordId } = mergeSubmitItemsInMemory('u1', items, [], now);
		const p = progressByWordId.get('w-new')!;

		expect(p.state).toBe('weak');
		expect(p.listeningTotal).toBe(1);
		expect(p.listeningCorrect).toBe(0);
		expect(p.listeningIntervalIdx).toBe(CN_LAPSE_FLOOR_IDX);
	});

	it('mergeSubmitItemsInMemory handles two items for new wordId in one batch', () => {
		const now = new Date('2026-06-17T10:00:00Z');
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
