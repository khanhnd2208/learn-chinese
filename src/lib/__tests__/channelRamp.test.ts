import { describe, it, expect } from 'vitest';
import { isChannelRampEligible } from '@/lib/chinese/channelRamp';
import { CN_RAMP_MEANING_INTERVAL_IDX } from '@/config/constants';
import type { CnWordProgress } from '@prisma/client';

function baseProgress(overrides: Partial<CnWordProgress> = {}): CnWordProgress {
	const now = new Date('2026-06-17T10:00:00Z');
	return {
		id: 'p1',
		userId: 'u1',
		wordId: 'w1',
		state: 'new',
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

describe('channelRamp', () => {
	it('meaning is always ramp eligible', () => {
		expect(isChannelRampEligible(baseProgress(), 'meaning')).toBe(true);
	});

	it('listening/pinyin require meaning interval threshold when never practiced', () => {
		const before = baseProgress({ meaningIntervalIdx: CN_RAMP_MEANING_INTERVAL_IDX - 1 });
		expect(isChannelRampEligible(before, 'listening')).toBe(false);
		expect(isChannelRampEligible(before, 'pinyin')).toBe(false);

		const after = baseProgress({ meaningIntervalIdx: CN_RAMP_MEANING_INTERVAL_IDX });
		expect(isChannelRampEligible(after, 'listening')).toBe(true);
		expect(isChannelRampEligible(after, 'pinyin')).toBe(true);
	});

	it('already-practiced listening/pinyin stay ramp eligible', () => {
		const p = baseProgress({
			meaningIntervalIdx: 0,
			listeningTotal: 1,
			pinyinTotal: 2,
		});
		expect(isChannelRampEligible(p, 'listening')).toBe(true);
		expect(isChannelRampEligible(p, 'pinyin')).toBe(true);
	});

	it('sentence defers to unlock rules', () => {
		expect(isChannelRampEligible(baseProgress(), 'sentence')).toBe(true);
	});
});
