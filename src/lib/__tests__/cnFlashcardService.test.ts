import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordSet: {
			findFirst: vi.fn(),
		},
		cnWord: {
			findMany: vi.fn(),
		},
		cnUserWordOverride: {
			findMany: vi.fn(),
		},
	},
}));

import { prisma } from '@/lib/prisma';
import { getFlashcardDeck } from '@/services/chinese/cnFlashcardService';

const mockFindFirst = vi.mocked(prisma.cnWordSet.findFirst);
const mockWordFindMany = vi.mocked(prisma.cnWord.findMany);
const mockOverrideFindMany = vi.mocked(prisma.cnUserWordOverride.findMany);

beforeEach(() => {
	mockFindFirst.mockReset();
	mockWordFindMany.mockReset();
	mockOverrideFindMany.mockReset();
	mockWordFindMany.mockResolvedValue([] as never);
	mockOverrideFindMany.mockResolvedValue([] as never);
});

describe('getFlashcardDeck', () => {
	it('does not read a set unless it belongs to the user', async () => {
		mockFindFirst.mockResolvedValue(null);

		await expect(getFlashcardDeck('user-1', 'set-other')).resolves.toBeNull();
		expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
			where: { id: 'set-other', userId: 'user-1' },
			include: expect.objectContaining({
				items: expect.objectContaining({
					include: {
						word: {
							include: {
								examples: { orderBy: { id: 'asc' } },
							},
						},
					},
				}),
			}),
		}));
	});

	it('returns an empty deck for a set with no items', async () => {
		mockFindFirst.mockResolvedValue({
			id: 'set-1',
			title: 'Bài 1',
			items: [],
		} as never);

		await expect(getFlashcardDeck('user-1', 'set-1')).resolves.toEqual({
			setId: 'set-1',
			title: 'Bài 1',
			cards: [],
			skippedCount: 0,
		});
	});

	it('skips incomplete words and keeps valid examples in priority order', async () => {
		mockFindFirst.mockResolvedValue({
			id: 'set-1',
			title: 'Bài 1',
			items: [
				{ id: 'i-raw', wordId: null, word: null },
				{
					id: 'i-incomplete',
					wordId: 'w-bad',
					word: { id: 'w-bad', simplified: '你', pinyin: '', meaningVi: 'bạn', examples: [] },
				},
				{
					id: 'i-ok',
					wordId: 'w-ok',
					word: {
						id: 'w-ok',
						simplified: '老师',
						pinyin: 'lǎoshī',
						meaningVi: 'giáo viên',
						examples: [
							{
								id: 'draft',
								hanzi: '老师好！',
								pinyin: 'Lǎoshī hǎo!',
								meaningVi: 'Chào giáo viên!',
								naturalnessStatus: 'draft',
								targetWordStart: 0,
								targetWordEnd: 2,
							},
							{
								id: 'blank-pinyin',
								hanzi: '他是老师。',
								pinyin: '',
								meaningVi: 'Anh ấy là giáo viên.',
								naturalnessStatus: 'verified',
								targetWordStart: 2,
								targetWordEnd: 4,
							},
							{
								id: 'verified',
								hanzi: '她是老师。',
								pinyin: 'Tā shì lǎoshī.',
								meaningVi: 'Cô ấy là giáo viên.',
								naturalnessStatus: 'verified',
								targetWordStart: 2,
								targetWordEnd: 4,
							},
						],
					},
				},
			],
		} as never);

		const deck = await getFlashcardDeck('user-1', 'set-1');
		expect(deck?.skippedCount).toBe(2);
		expect(deck?.cards).toHaveLength(1);
		expect(deck?.cards[0]?.examples.map((example) => example.id)).toEqual(['verified', 'draft']);
	});
});
