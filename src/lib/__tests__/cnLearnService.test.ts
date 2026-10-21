import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CN_NEW_WORDS_PER_DAY } from '@/config/constants';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordProgress: {
			count: vi.fn(),
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		cnWordSetItem: { findMany: vi.fn() },
	},
}));

vi.mock('@/services/chinese/cnSrsEnrollmentService', () => ({
	resolveSrsPoolWordIds: vi.fn(),
	ensureEnrollmentForActiveWords: vi.fn(),
}));

vi.mock('@/services/chinese/cnContentService', () => ({
	getWordCardsForSrsPool: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getWordCardsForSrsPool } from '@/services/chinese/cnContentService';
import { resolveSrsPoolWordIds } from '@/services/chinese/cnSrsEnrollmentService';
import { getLearnQueue, markIntroduced } from '@/services/chinese/cnLearnService';

const mockCount = vi.mocked(prisma.cnWordProgress.count);
const mockFindMany = vi.mocked(prisma.cnWordProgress.findMany);
const mockUpdateMany = vi.mocked(prisma.cnWordProgress.updateMany);
const mockSetItems = vi.mocked(prisma.cnWordSetItem.findMany);
const mockPool = vi.mocked(resolveSrsPoolWordIds);
const mockCards = vi.mocked(getWordCardsForSrsPool);

const now = new Date('2026-10-21T15:00:00');

function card(id: string) {
	return {
		id,
		simplified: id,
		pinyin: 'p',
		hanViet: 'hv',
		meaningVi: 'nghĩa',
		partOfSpeech: '',
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published' as const,
		examples: [
			{ id: 'e1', hanzi: 'câu 1', pinyin: '', meaningVi: '' },
			{ id: 'e2', hanzi: 'câu 2', pinyin: '', meaningVi: '' },
		],
		patterns: [],
		chars: [],
		relatedWords: [],
	};
}

describe('cnLearnService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPool.mockResolvedValue(new Set(['w1', 'w2', 'w3']));
		mockSetItems.mockResolvedValue([
			{ id: 'item-a', wordId: 'w1' },
			{ id: 'item-b', wordId: 'w2' },
			{ id: 'item-c', wordId: 'w3' },
		] as never);
		mockCards.mockImplementation(async (_userId, ids) => new Map(ids.map((id) => [id, card(id)])));
		mockUpdateMany.mockResolvedValue({ count: 1 });
	});

	it('stops at the daily quota and only loads unintroduced words', async () => {
		mockCount
			.mockResolvedValueOnce(CN_NEW_WORDS_PER_DAY - 1)
			.mockResolvedValueOnce(3);
		mockFindMany.mockResolvedValue([
			{ wordId: 'w3', word: { learningPriority: null, frequencyRank: 1 } },
			{ wordId: 'w1', word: { learningPriority: 1, frequencyRank: 9 } },
		] as never);

		const queue = await getLearnQueue('user-a', 5, now);

		expect(queue.remainingToday).toBe(1);
		expect(queue.words.map((word) => word.id)).toEqual(['w1']);
		expect(queue.words[0]?.examples).toHaveLength(1);
		expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
			where: { userId: 'user-a', introducedAt: null, wordId: { in: ['w1', 'w2', 'w3'] } },
		}));
	});

	it('returns no words once today is full', async () => {
		mockCount.mockResolvedValueOnce(CN_NEW_WORDS_PER_DAY).mockResolvedValueOnce(4);
		const queue = await getLearnQueue('user-a', 5, now);
		expect(queue.words).toEqual([]);
		expect(queue.remainingToday).toBe(0);
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	it('marks only as many words as the quota allows for this user', async () => {
		mockCount.mockResolvedValueOnce(CN_NEW_WORDS_PER_DAY - 1);
		mockFindMany.mockResolvedValue([
			{ wordId: 'w1' },
			{ wordId: 'w2' },
		] as never);
		mockUpdateMany.mockResolvedValue({ count: 1 });

		const result = await markIntroduced('user-a', ['w1', 'w2', 'other-user-word'], now);

		expect(result.marked).toBe(1);
		expect(mockUpdateMany).toHaveBeenCalledWith({
			where: { userId: 'user-a', wordId: { in: ['w1'] }, introducedAt: null },
			data: { introducedAt: now, meaningDueAt: now },
		});
	});

	it('does not update progress outside this user pool', async () => {
		mockPool.mockResolvedValue(new Set(['w1']));
		mockCount.mockResolvedValueOnce(0);
		mockFindMany.mockResolvedValue([] as never);

		const result = await markIntroduced('user-a', ['user-b-word'], now);

		expect(result.marked).toBe(0);
		expect(mockUpdateMany).not.toHaveBeenCalled();
	});
});
