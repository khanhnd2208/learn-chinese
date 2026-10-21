import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWord: {
			findMany: vi.fn(),
		},
		cnWordChar: {
			findMany: vi.fn(),
		},
		cnWordProgress: {
			findMany: vi.fn(),
		},
		cnUserWordOverride: {
			findMany: vi.fn(),
		},
	},
}));

import { prisma } from '@/lib/prisma';
import { getWordCardsByIds } from '@/services/chinese/cnContentService';

const mockWordFindMany = vi.mocked(prisma.cnWord.findMany);
const mockWordCharFindMany = vi.mocked(prisma.cnWordChar.findMany);
const mockProgressFindMany = vi.mocked(prisma.cnWordProgress.findMany);
const mockOverrideFindMany = vi.mocked(prisma.cnUserWordOverride.findMany);

const wordRow = {
	id: 'w1',
	simplified: '学习',
	pinyin: 'xuéxí',
	hanViet: 'học tập',
	meaningVi: 'học tập',
	partOfSpeech: '',
	mnemonicVi: '',
	usageNoteVi: '',
	ghiChu: '',
	hskLevel: 1,
	pinyinPlain: '',
	pinyinNumbered: '',
	pinyinSyllables: [],
	tones: [],
	frequencyRank: null,
	difficultyLevel: null,
	isFunctionWord: false,
	learningPriority: null,
	status: 'published' as const,
	systemCheckedFields: [],
	expertVerifiedFields: [],
	verifiedAt: null,
	verifiedById: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	examples: [],
	patterns: [],
	chars: [{ position: 0, hanziId: 'h1', hanzi: {
		id: 'h1',
		char: '学',
		pinyin: '',
		hanViet: '',
		meaningVi: '',
		components: [],
		radical: '',
		mnemonicVi: '',
		similarGroupId: null,
		componentAnalysisStatus: 'basic',
		structureType: null,
		strokeCount: null,
		status: 'published' as const,
		systemCheckedFields: [],
		expertVerifiedFields: [],
		verifiedAt: null,
		verifiedById: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	} }],
};

beforeEach(() => {
	mockWordFindMany.mockReset();
	mockWordCharFindMany.mockReset();
	mockProgressFindMany.mockReset();
	mockOverrideFindMany.mockReset();
	mockOverrideFindMany.mockResolvedValue([] as never);
});

describe('getWordCardsByIds', () => {
	it('batch-loads cards with grouped queries instead of per-id fetches', async () => {
		mockWordFindMany.mockResolvedValueOnce([wordRow] as never);
		mockWordCharFindMany.mockResolvedValueOnce([{ hanziId: 'h1' }] as never);
		mockWordFindMany.mockResolvedValueOnce([] as never);
		mockProgressFindMany.mockResolvedValueOnce([] as never);

		const map = await getWordCardsByIds(['w1'], 'user-1');

		expect(map.get('w1')?.simplified).toBe('学习');
		expect(mockWordFindMany).toHaveBeenCalledTimes(2);
		expect(mockProgressFindMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', wordId: { in: ['w1'] } },
		});
	});
});
