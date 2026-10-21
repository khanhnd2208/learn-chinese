import { beforeEach, describe, expect, it, vi } from 'vitest';

const savedIds: string[] = [];
const createdLogs: Array<Array<{ correct: boolean; clientAnswerId: string | null }>> = [];
const progressUpdates: Array<{ meaningCorrect: number; meaningTotal: number }> = [];
let overrideMeaning: string | null = null;

vi.mock('@/services/chinese/cnSrsEnrollmentService', () => ({
	resolveSrsPoolWordIds: vi.fn(async () => new Set(['w1'])),
	ensureEnrollmentForActiveWords: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWord: {
			count: vi.fn(async () => 1),
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
			findMany: vi.fn(async () => (overrideMeaning == null
				? []
				: [{
					userId: 'user-a',
					wordId: 'w1',
					pinyin: null,
					hanViet: null,
					meaningVi: overrideMeaning,
					partOfSpeech: null,
					ghiChu: null,
					mnemonicVi: null,
				}])),
		},
		cnAnswerLog: {
			findMany: vi.fn(async () => savedIds.map((id) => ({ clientAnswerId: id }))),
			createMany: vi.fn(async ({ data }: { data: Array<{ correct: boolean; clientAnswerId: string | null }> }) => {
				createdLogs.push(data);
				for (const row of data) {
					if (row.clientAnswerId) savedIds.push(row.clientAnswerId);
				}
				return { count: data.length };
			}),
		},
		cnWordProgress: {
			findMany: vi.fn(async () => [{
				id: 'p1',
				userId: 'user-a',
				wordId: 'w1',
				state: 'learning',
				dueAt: new Date(),
				intervalIdx: 0,
				lastReviewedAt: null,
				meaningCorrect: 0,
				meaningTotal: 0,
				soundCorrect: 0,
				soundTotal: 0,
				sentenceCorrect: 0,
				sentenceTotal: 0,
				meaningDueAt: new Date(),
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
				introducedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			}]),
			update: vi.fn(async ({ data }: { data: { meaningCorrect: number; meaningTotal: number } }) => {
				progressUpdates.push({ meaningCorrect: data.meaningCorrect, meaningTotal: data.meaningTotal });
				return data;
			}),
		},
		$transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
	},
}));

import { submitReviewResults } from '@/services/chinese/cnSrsService';

const item = {
	wordId: 'w1',
	questionType: 'hanzi_to_meaning' as const,
	correct: true,
	answer: 'sai',
	clientAnswerId: 'answer-1',
};

describe('submitReviewResults grading', () => {
	beforeEach(() => {
		savedIds.length = 0;
		createdLogs.length = 0;
		progressUpdates.length = 0;
		overrideMeaning = null;
	});

	it('stores a wrong answer when the client claims it was correct', async () => {
		const result = await submitReviewResults('user-a', [item]);
		expect(result.updated).toBe(1);
		expect(createdLogs[0]?.[0]?.correct).toBe(false);
		expect(progressUpdates[0]).toEqual({ meaningCorrect: 0, meaningTotal: 1 });
	});

	it('applies one answer id only once', async () => {
		await submitReviewResults('user-a', [item]);
		const second = await submitReviewResults('user-a', [item]);
		expect(second.updated).toBe(0);
		expect(createdLogs).toHaveLength(1);
		expect(progressUpdates).toHaveLength(1);
	});

	it('grades the learner gloss instead of the shared gloss', async () => {
		overrideMeaning = 'X';
		await submitReviewResults('user-a', [{
			...item,
			clientAnswerId: 'answer-2',
			correct: false,
			answer: 'X',
		}]);
		expect(createdLogs[0]?.[0]?.correct).toBe(true);
		expect(progressUpdates[0]?.meaningCorrect).toBe(1);
	});
});
