import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CN_REVIEW_SECONDS_PER_ITEM } from '@/config/constants';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnAnswerLog: { findMany: vi.fn() },
		cnWordProgress: { findMany: vi.fn() },
	},
}));

vi.mock('@/services/chinese/cnSrsEnrollmentService', () => ({
	resolveSrsPoolWordIds: vi.fn(),
}));

vi.mock('@/services/chinese/cnSrsService', () => ({
	countDueToday: vi.fn(),
	loadWordIdsWithFillExamples: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { resolveSrsPoolWordIds } from '@/services/chinese/cnSrsEnrollmentService';
import { countDueToday, loadWordIdsWithFillExamples } from '@/services/chinese/cnSrsService';
import { getReviewBriefing } from '@/services/chinese/cnReviewStatsService';

const mockCountDueToday = vi.mocked(countDueToday);
const mockResolveSrsPoolWordIds = vi.mocked(resolveSrsPoolWordIds);
const mockLoadWordIdsWithFillExamples = vi.mocked(loadWordIdsWithFillExamples);
const mockAnswerLogFindMany = vi.mocked(prisma.cnAnswerLog.findMany);
const mockProgressFindMany = vi.mocked(prisma.cnWordProgress.findMany);

describe('getReviewBriefing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCountDueToday.mockResolvedValue(6);
		mockResolveSrsPoolWordIds.mockResolvedValue(new Set(['w1', 'w2']));
		mockLoadWordIdsWithFillExamples.mockResolvedValue(new Set(['w1', 'w2']));
		mockAnswerLogFindMany.mockResolvedValue([]);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- prisma mock return typing
		(mockProgressFindMany as any).mockImplementation((args: { select?: Record<string, boolean> }) => {
			if (args?.select && 'meaningCorrect' in args.select && !('meaningDueAt' in args.select)) {
				return Promise.resolve([
					{ meaningCorrect: 5, meaningTotal: 10, soundCorrect: 3, soundTotal: 5, sentenceCorrect: 0, sentenceTotal: 0 },
				]);
			}
			return Promise.resolve([
				{
					wordId: 'w1',
					state: 'learning',
					meaningIntervalIdx: 0,
					soundIntervalIdx: 0,
					sentenceIntervalIdx: 0,
					meaningDueAt: new Date('2020-01-01'),
					soundDueAt: null,
					sentenceDueAt: null,
					meaningCorrect: 1,
					meaningTotal: 1,
					soundCorrect: 0,
					soundTotal: 0,
					sentenceCorrect: 0,
					sentenceTotal: 0,
					dueAt: new Date('2020-01-01'),
					introducedAt: new Date('2020-01-01'),
				},
				{
					wordId: 'w2',
					state: 'familiar',
					meaningIntervalIdx: 3,
					soundIntervalIdx: 3,
					sentenceIntervalIdx: 0,
					meaningDueAt: new Date('2020-01-01'),
					soundDueAt: new Date('2020-01-01'),
					sentenceDueAt: null,
					meaningCorrect: 5,
					meaningTotal: 5,
					soundCorrect: 3,
					soundTotal: 3,
					sentenceCorrect: 0,
					sentenceTotal: 0,
					dueAt: new Date('2020-01-01'),
					introducedAt: new Date('2020-01-01'),
				},
			]);
		});
	});

	it('returns due channels and estimated minutes', async () => {
		const briefing = await getReviewBriefing('user-1');
		expect(briefing.dueChannels).toBe(6);
		expect(briefing.estimatedMinutes).toBe(
			Math.max(1, Math.ceil((6 * CN_REVIEW_SECONDS_PER_ITEM) / 60)),
		);
	});

	it('counts unique due words from progress metrics', async () => {
		const briefing = await getReviewBriefing('user-1');
		expect(briefing.dueWords).toBeGreaterThanOrEqual(1);
	});

	it('returns zero estimated minutes when nothing is due', async () => {
		mockCountDueToday.mockResolvedValue(0);
		const briefing = await getReviewBriefing('user-1');
		expect(briefing.estimatedMinutes).toBe(0);
	});
});
