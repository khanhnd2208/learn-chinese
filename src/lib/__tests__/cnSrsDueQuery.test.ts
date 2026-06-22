import { describe, it, expect } from 'vitest';
import { ALL_SKILL_CHANNELS } from '@/lib/chinese/practiceTaxonomy';
import { progressMatchesDueCandidateSuperset } from '@/lib/chinese/cnSrsDueQuery';
import { isChannelDue } from '@/services/chinese/cnSrsService';
import {
	CN_FIRST_WRONG_RETRY_MINUTES,
	CN_SRS_INTERVALS_MINUTES,
	CN_STATE_THRESHOLDS,
} from '@/config/constants';
import type { CnWordProgress } from '@prisma/client';

const now = new Date('2026-06-17T10:00:00Z');

function progressFixture(overrides: Partial<CnWordProgress> = {}): CnWordProgress {
	return {
		id: 'p1',
		userId: 'u1',
		wordId: 'w1',
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

function anyChannelDue(p: CnWordProgress, at: Date): boolean {
	return ALL_SKILL_CHANNELS.some((ch) => isChannelDue(p, ch, at));
}

describe('cnSrsDueQuery superset safety', () => {
	const fixtures: CnWordProgress[] = [
		progressFixture(),
		progressFixture({
			meaningTotal: 2,
			meaningCorrect: 2,
			meaningIntervalIdx: 1,
			meaningDueAt: new Date(now.getTime() + CN_SRS_INTERVALS_MINUTES[1] * 60_000),
		}),
		progressFixture({
			listeningTotal: 1,
			listeningCorrect: 0,
			listeningDueAt: new Date(now.getTime() + CN_FIRST_WRONG_RETRY_MINUTES * 60_000),
		}),
		progressFixture({
			meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar,
			sentenceTotal: 0,
			sentenceUnlockedAt: now,
		}),
		progressFixture({
			listeningTotal: 5,
			listeningCorrect: 1,
			listeningDueAt: new Date(now.getTime() + CN_SRS_INTERVALS_MINUTES[4] * 60_000),
			listeningIntervalIdx: 4,
		}),
	];

	it('every due (word, channel) row matches SQL superset mirror', () => {
		for (const p of fixtures) {
			if (anyChannelDue(p, now)) {
				expect(progressMatchesDueCandidateSuperset(p, now)).toBe(true);
			}
		}
	});

	it('filtered count matches full scan on fixture set', () => {
		const fullCount = fixtures.reduce((sum, p) => {
			return sum + ALL_SKILL_CHANNELS.filter((ch) => isChannelDue(p, ch, now)).length;
		}, 0);
		const candidateFixtures = fixtures.filter((p) => progressMatchesDueCandidateSuperset(p, now));
		const filteredCount = candidateFixtures.reduce((sum, p) => {
			return sum + ALL_SKILL_CHANNELS.filter((ch) => isChannelDue(p, ch, now)).length;
		}, 0);
		expect(filteredCount).toBe(fullCount);
	});
});
