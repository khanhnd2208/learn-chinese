import { describe, it, expect } from 'vitest';
import { isChannelRampEligible } from '@/lib/chinese/channelRamp';
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
		soundCorrect: 0,
		soundTotal: 0,
		sentenceCorrect: 0,
		sentenceTotal: 0,
		meaningDueAt: null,
		meaningIntervalIdx: 0,
		soundDueAt: null,
		soundIntervalIdx: 0,
		sentenceDueAt: null,
		sentenceIntervalIdx: 0,
		sentenceUnlockedAt: null,
		lastExampleId: null,
		meaningHeavyLapses: 0,
		soundHeavyLapses: 0,
		sentenceHeavyLapses: 0,
		isStickingPoint: false,
		meaningMarkedKnownAt: null,
		soundMarkedKnownAt: null,
		sentenceMarkedKnownAt: null,
		sentenceIntroDayKey: null,
		sentenceIntroDayCount: 0,
		introducedAt: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

describe('channelRamp', () => {
	it('closes every channel until the word is introduced', () => {
		const p = baseProgress();
		expect(isChannelRampEligible(p, 'meaning')).toBe(false);
		expect(isChannelRampEligible(p, 'sound')).toBe(false);
		expect(isChannelRampEligible(p, 'sentence')).toBe(false);
	});

	it('opens meaning immediately, sound at idx 1, and sentence at idx 2', () => {
		const introduced = baseProgress({ introducedAt: new Date('2026-06-17T10:00:00Z') });
		expect(isChannelRampEligible(introduced, 'meaning')).toBe(true);
		expect(isChannelRampEligible(introduced, 'sound')).toBe(false);
		expect(isChannelRampEligible(introduced, 'sentence')).toBe(false);
		expect(isChannelRampEligible(baseProgress({ introducedAt: introduced.introducedAt, meaningIntervalIdx: 1 }), 'sound')).toBe(true);
		expect(isChannelRampEligible(baseProgress({ introducedAt: introduced.introducedAt, meaningIntervalIdx: 2 }), 'sentence')).toBe(true);
	});

	it('does not close a channel the learner has already practiced', () => {
		const p = baseProgress({ meaningIntervalIdx: 0, soundTotal: 3 });
		expect(isChannelRampEligible(p, 'sound')).toBe(true);
	});
});
