import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	computeNextReview,
	countDueChannelsForProgressList,
	nextStateFromInterval,
	mergeSubmitItemsInMemory,
	isChannelDue,
	submitReviewResults,
} from '@/services/chinese/cnSrsService';

const answerLogHarness = vi.hoisted(() => ({
	logs: [] as Array<Record<string, unknown>>,
	examples: [] as Array<{ id: string; wordId: string; ownerUserId: string | null }>,
}));

vi.mock('@/services/chinese/cnSrsEnrollmentService', () => ({
	resolveSrsPoolWordIds: vi.fn(async () => new Set(['w1'])),
	ensureEnrollmentForActiveWords: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWord: {
			count: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length),
			findMany: vi.fn(async () => [{
				id: 'w1',
				simplified: '学生',
				pinyin: 'xuésheng',
				hanViet: 'học sinh',
				meaningVi: 'học sinh',
				partOfSpeech: 'n',
				ghiChu: '',
				mnemonicVi: '',
				examples: [],
			}]),
		},
		cnUserWordOverride: {
			findMany: vi.fn(async () => []),
		},
		cnExample: {
			findMany: vi.fn(async ({ where }: { where: { id: { in: string[] }; OR: Array<{ ownerUserId: string | null }> } }) => {
				const allowedOwners = new Set(where.OR.map((clause) => clause.ownerUserId));
				return answerLogHarness.examples.filter((row) =>
					where.id.in.includes(row.id) && allowedOwners.has(row.ownerUserId),
				);
			}),
		},
		cnAnswerLog: {
			findMany: vi.fn(async () => []),
			createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
				answerLogHarness.logs.push(...data);
				return { count: data.length };
			}),
		},
		cnWordProgress: {
			findMany: vi.fn(async () => [{
				id: 'p1',
				userId: 'user-a',
				wordId: 'w1',
				state: 'familiar',
				dueAt: new Date('2026-06-17T10:00:00Z'),
				intervalIdx: 3,
				lastReviewedAt: null,
				meaningCorrect: 4,
				meaningTotal: 4,
				soundCorrect: 2,
				soundTotal: 2,
				sentenceCorrect: 1,
				sentenceTotal: 2,
				meaningDueAt: new Date('2026-06-17T10:00:00Z'),
				meaningIntervalIdx: 3,
				soundDueAt: new Date('2026-06-17T10:00:00Z'),
				soundIntervalIdx: 2,
				sentenceDueAt: new Date('2026-06-17T10:00:00Z'),
				sentenceIntervalIdx: 3,
				sentenceUnlockedAt: new Date('2026-06-17T10:00:00Z'),
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
				introducedAt: new Date('2026-06-01T00:00:00Z'),
				createdAt: new Date('2026-06-01T00:00:00Z'),
				updatedAt: new Date('2026-06-01T00:00:00Z'),
			}]),
			update: vi.fn(async () => ({})),
		},
		$transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
	},
}));
import {
	addDays,
	addMinutes,
	CN_LAPSE_RECALL_IDX,
	CN_SRS_INTERVAL_DAYS,
	CN_STATE_THRESHOLDS,
	CN_STICKING_POINT_HEAVY_LAPSES,
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

	it('caps at max maintain tier (120 days)', () => {
		const last = CN_SRS_INTERVAL_DAYS.length - 1;
		const next = computeNextReview({ intervalIdx: last, correct: true, now });
		expect(next.intervalIdx).toBe(last);
		expect(next.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[last]).getTime());
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
		const next = computeNextReview({ intervalIdx: 2, correct: false, now });
		expect(next.intervalIdx).toBe(1);
		expect(next.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[0]).getTime());
	});

	it('Maintain wrong regresses to Recall due tomorrow', () => {
		const at30 = computeNextReview({ intervalIdx: 5, correct: false, now });
		expect(at30.intervalIdx).toBe(CN_LAPSE_RECALL_IDX);
		expect(at30.dueAt.getTime()).toBe(addDays(now, 1).getTime());

		const at7 = computeNextReview({ intervalIdx: 3, correct: false, now });
		expect(at7.intervalIdx).toBe(2);
		expect(at7.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[0]).getTime());
	});

	it('keeps an unintroduced word out of review', () => {
		const p = progressFixture({ id: 'p1', userId: 'u1', wordId: 'w-new' });
		expect(isChannelDue(p, 'meaning', now)).toBe(false);
		expect(isChannelDue(p, 'sound', now)).toBe(false);
		expect(isChannelDue(p, 'sentence', now)).toBe(false);
	});

	it('opens meaning first, then sound, then sentence', () => {
		const introduced = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			introducedAt: now,
		});
		expect(isChannelDue(introduced, 'meaning', now)).toBe(true);
		expect(isChannelDue(introduced, 'sound', now)).toBe(false);
		expect(isChannelDue(introduced, 'sentence', now)).toBe(false);

		const soundOpen = progressFixture({
			id: 'p2',
			userId: 'u1',
			wordId: 'w2',
			introducedAt: now,
			meaningIntervalIdx: 1,
		});
		expect(isChannelDue(soundOpen, 'sound', now)).toBe(true);
		expect(isChannelDue(soundOpen, 'sentence', now)).toBe(false);

		const sentenceOpen = progressFixture({
			id: 'p3',
			userId: 'u1',
			wordId: 'w3',
			introducedAt: now,
			meaningIntervalIdx: 2,
		});
		expect(isChannelDue(sentenceOpen, 'sentence', now)).toBe(true);
	});

	it('keeps a practiced sound channel open after meaning drops', () => {
		const p = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			introducedAt: now,
			meaningIntervalIdx: 0,
			soundTotal: 2,
			soundDueAt: now,
		});
		expect(isChannelDue(p, 'sound', now)).toBe(true);
	});

	it('does not due early before interval expires', () => {
		const future = addDays(now, CN_SRS_INTERVAL_DAYS[3]);
		const p = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			soundTotal: 5,
			soundCorrect: 4,
			soundDueAt: future,
			soundIntervalIdx: 3,
		});
		expect(isChannelDue(p, 'sound', now)).toBe(false);
	});

	it('excludes sentence channel without fill examples from due counts', () => {
		const p = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w-no-fill',
			introducedAt: now,
			meaningIntervalIdx: 2,
		});
		const withFill = new Set(['w-has-fill']);
		const withExample = progressFixture({
			id: 'p2',
			userId: 'u1',
			wordId: 'w-has-fill',
			introducedAt: now,
			meaningIntervalIdx: 2,
		});
		const list = [p, withExample];

		expect(countDueChannelsForProgressList(list, now)).toBe(6);
		expect(countDueChannelsForProgressList(list, now, withFill)).toBe(5);
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
			{ wordId: 'w-new', questionType: 'sound_to_hanzi', correct: false },
		];
		const { progressByWordId } = mergeSubmitItemsInMemory('u1', items, [], now);
		const p = progressByWordId.get('w-new')!;

		expect(p.state).toBe('weak');
		expect(p.soundTotal).toBe(1);
		expect(p.soundCorrect).toBe(0);
		expect(p.soundIntervalIdx).toBe(0);
		expect(p.soundDueAt!.getTime()).toBe(addMinutes(now, CN_WRONG_FIRST_RETRY_MINUTES).getTime());
		expect(p.soundHeavyLapses).toBe(0);
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

	it('does not promote or count a correct answer that used a hint', () => {
		const existing = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			meaningCorrect: 4,
			meaningTotal: 4,
			meaningIntervalIdx: 3,
			meaningDueAt: now,
		});
		const items: CnPracticeSubmitItem[] = [
			{ wordId: 'w1', questionType: 'hanzi_to_meaning', correct: true, hintUsed: true },
		];
		const p = mergeSubmitItemsInMemory('u1', items, [existing], now).progressByWordId.get('w1')!;
		expect(p.meaningTotal).toBe(5);
		expect(p.meaningCorrect).toBe(4);
		expect(p.meaningIntervalIdx).toBe(3);
		expect(p.meaningDueAt!.getTime()).toBe(addDays(now, 1).getTime());
	});

	it('does not count a heavy lapse for a wrong answer before Recall', () => {
		const existing = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			meaningTotal: 2,
			meaningIntervalIdx: 1,
		});
		const items: CnPracticeSubmitItem[] = [
			{ wordId: 'w1', questionType: 'hanzi_to_meaning', correct: false },
		];
		const { progressByWordId } = mergeSubmitItemsInMemory('u1', items, [existing], now);
		const p = progressByWordId.get('w1')!;
		expect(p.meaningIntervalIdx).toBe(0);
		expect(p.meaningHeavyLapses).toBe(0);
		expect(p.isStickingPoint).toBe(false);
	});

	it('counts a heavy lapse once Recall has been reached and flags a sticking point at the threshold', () => {
		const recalled = progressFixture({
			id: 'p1',
			userId: 'u1',
			wordId: 'w1',
			meaningTotal: 3,
			meaningIntervalIdx: 2,
		});
		const once = mergeSubmitItemsInMemory('u1', [
			{ wordId: 'w1', questionType: 'hanzi_to_meaning', correct: false },
		], [recalled], now).progressByWordId.get('w1')!;
		expect(once.meaningHeavyLapses).toBe(1);
		expect(once.isStickingPoint).toBe(false);

		const maintained = progressFixture({
			id: 'p2',
			userId: 'u1',
			wordId: 'w2',
			meaningTotal: 6,
			meaningIntervalIdx: 5,
			meaningHeavyLapses: CN_STICKING_POINT_HEAVY_LAPSES - 1,
		});
		const flagged = mergeSubmitItemsInMemory('u1', [
			{ wordId: 'w2', questionType: 'hanzi_to_meaning', correct: false },
		], [maintained], now).progressByWordId.get('w2')!;
		expect(flagged.meaningIntervalIdx).toBe(2);
		expect(flagged.meaningHeavyLapses).toBe(CN_STICKING_POINT_HEAVY_LAPSES);
		expect(flagged.isStickingPoint).toBe(true);
	});
});

describe('submitReviewResults answer log context', () => {
	beforeEach(() => {
		answerLogHarness.logs.length = 0;
		answerLogHarness.examples.length = 0;
	});

	it('records the sentence interval from before the answer is applied', async () => {
		answerLogHarness.examples.push({ id: 'ex-1', wordId: 'w1', ownerUserId: null });
		await submitReviewResults('user-a', [{
			wordId: 'w1',
			questionType: 'fill_sentence_typed',
			correct: true,
			answer: '学生',
			exampleId: 'ex-1',
			clientAnswerId: 'log-sentence',
			attempts: 1,
		}]);
		expect(answerLogHarness.logs[0]).toEqual(expect.objectContaining({
			exampleId: 'ex-1',
			channelIdxBefore: 3,
			answer: '学生',
			attempts: 1,
		}));
	});

	it('drops an example id that belongs to a different word', async () => {
		answerLogHarness.examples.push({ id: 'ex-other', wordId: 'w-other', ownerUserId: null });
		await submitReviewResults('user-a', [{
			wordId: 'w1',
			questionType: 'fill_sentence',
			correct: true,
			answer: '学生',
			exampleId: 'ex-other',
			clientAnswerId: 'log-other-word',
		}]);
		expect(answerLogHarness.logs[0]?.exampleId).toBeNull();
	});

	it('does not store an example id for a meaning-channel answer', async () => {
		answerLogHarness.examples.push({ id: 'ex-1', wordId: 'w1', ownerUserId: null });
		await submitReviewResults('user-a', [{
			wordId: 'w1',
			questionType: 'hanzi_to_meaning',
			correct: true,
			answer: 'học sinh',
			exampleId: 'ex-1',
			clientAnswerId: 'log-meaning',
		}]);
		expect(answerLogHarness.logs[0]).toEqual(expect.objectContaining({
			exampleId: null,
			answer: null,
			channelIdxBefore: 3,
		}));
	});
});
