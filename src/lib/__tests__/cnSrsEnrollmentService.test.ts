import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	deactivateSetFromSrs,
	getExclusiveWordIdsForSet,
	getSrsActiveWordIds,
	previewRemoveWordFromSet,
	purgeSrsProgressForSet,
} from '@/services/chinese/cnSrsEnrollmentService';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordSetItem: {
			findMany: vi.fn(),
		},
		cnWordSet: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		cnWordProgress: {
			deleteMany: vi.fn(),
		},
	},
}));

import { prisma } from '@/lib/prisma';

const mockFindMany = vi.mocked(prisma.cnWordSetItem.findMany);
const mockSetFindFirst = vi.mocked(prisma.cnWordSet.findFirst);
const mockSetUpdate = vi.mocked(prisma.cnWordSet.update);
const mockProgressDeleteMany = vi.mocked(prisma.cnWordProgress.deleteMany);

beforeEach(() => {
	mockFindMany.mockReset();
	mockSetFindFirst.mockReset();
	mockSetUpdate.mockReset();
	mockProgressDeleteMany.mockReset();
});

describe('getSrsActiveWordIds', () => {
	it('returns unique word ids from active sets', async () => {
		mockFindMany.mockResolvedValueOnce([
			{ wordId: 'w1' },
			{ wordId: 'w2' },
			{ wordId: 'w1' },
		] as never);
		const ids = await getSrsActiveWordIds('user-1');
		expect(ids).toEqual(new Set(['w1', 'w2']));
	});
});

describe('getExclusiveWordIdsForSet', () => {
	it('returns words only in this set among active SRS sets', async () => {
		mockFindMany
			.mockResolvedValueOnce([{ wordId: 'w1' }, { wordId: 'w2' }, { wordId: 'w3' }] as never)
			.mockResolvedValueOnce([{ wordId: 'w2' }] as never);

		const exclusive = await getExclusiveWordIdsForSet('user-1', 'set-a');
		expect(exclusive).toEqual(['w1', 'w3']);
	});
});

describe('deactivateSetFromSrs', () => {
	it('turns off srsActive without deleting progress', async () => {
		mockSetFindFirst.mockResolvedValueOnce({ id: 'set-a' } as never);
		mockSetUpdate.mockResolvedValueOnce({} as never);

		await deactivateSetFromSrs('user-1', 'set-a');

		expect(mockSetUpdate).toHaveBeenCalledWith({
			where: { id: 'set-a' },
			data: { srsActive: false },
		});
		expect(mockProgressDeleteMany).not.toHaveBeenCalled();
	});
});

describe('purgeSrsProgressForSet', () => {
	it('deletes progress for exclusive words only', async () => {
		mockSetFindFirst.mockResolvedValueOnce({ id: 'set-a' } as never);
		mockFindMany
			.mockResolvedValueOnce([{ wordId: 'w1' }, { wordId: 'w2' }] as never)
			.mockResolvedValueOnce([] as never);
		mockProgressDeleteMany.mockResolvedValueOnce({ count: 2 } as never);

		const result = await purgeSrsProgressForSet('user-1', 'set-a');

		expect(result.purgedWordCount).toBe(2);
		expect(mockProgressDeleteMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', wordId: { in: ['w1', 'w2'] } },
		});
		expect(mockSetUpdate).not.toHaveBeenCalled();
	});
});

describe('previewRemoveWordFromSet', () => {
	it('returns no purge when set is not SRS-active', async () => {
		mockSetFindFirst.mockResolvedValueOnce({ srsActive: false } as never);
		const preview = await previewRemoveWordFromSet('user-1', 'set-a', 'w1');
		expect(preview).toEqual({ wouldPurgeProgress: false, inOtherActiveSet: false });
	});

	it('returns purge when word is exclusive to this SRS set', async () => {
		mockSetFindFirst.mockResolvedValueOnce({ srsActive: true } as never);
		mockFindMany.mockResolvedValueOnce([] as never);
		const preview = await previewRemoveWordFromSet('user-1', 'set-a', 'w1');
		expect(preview).toEqual({ wouldPurgeProgress: true, inOtherActiveSet: false });
	});
});
