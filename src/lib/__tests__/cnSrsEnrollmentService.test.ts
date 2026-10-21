import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	activateSetInSrs,
	deactivateSetFromSrs,
	getExclusiveWordIdsForSet,
	getSrsActiveWordIds,
	previewRemoveWordFromSet,
	purgeSrsProgressForSet,
	resolveSrsPoolWordIds,
} from '@/services/chinese/cnSrsEnrollmentService';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordSetItem: {
			findMany: vi.fn(),
			update: vi.fn(),
			count: vi.fn(),
		},
		cnWordSet: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		cnSetEnrollment: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
			update: vi.fn(),
		},
		cnWordProgress: {
			createMany: vi.fn(),
			deleteMany: vi.fn(),
			findMany: vi.fn(),
		},
		cnWord: {
			findMany: vi.fn(),
		},
		$transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
	},
}));

import { prisma } from '@/lib/prisma';

const mockFindMany = vi.mocked(prisma.cnWordSetItem.findMany);
const mockItemUpdate = vi.mocked(prisma.cnWordSetItem.update);
const mockSetFindFirst = vi.mocked(prisma.cnWordSet.findFirst);
const mockSetUpdate = vi.mocked(prisma.cnWordSet.update);
const mockEnrollmentFindUnique = vi.mocked(prisma.cnSetEnrollment.findUnique);
const mockEnrollmentUpsert = vi.mocked(prisma.cnSetEnrollment.upsert);
const mockEnrollmentUpdate = vi.mocked(prisma.cnSetEnrollment.update);
const mockProgressDeleteMany = vi.mocked(prisma.cnWordProgress.deleteMany);
const mockProgressCreateMany = vi.mocked(prisma.cnWordProgress.createMany);
const mockProgressFindMany = vi.mocked(prisma.cnWordProgress.findMany);
const mockWordFindMany = vi.mocked(prisma.cnWord.findMany);

const viewable = { userId: 'user-1', shared: false, enrollments: [] as Array<{ id: string }> };

beforeEach(() => {
	mockFindMany.mockReset();
	mockItemUpdate.mockReset();
	mockSetFindFirst.mockReset();
	mockSetUpdate.mockReset();
	mockEnrollmentFindUnique.mockReset();
	mockEnrollmentUpsert.mockReset();
	mockEnrollmentUpdate.mockReset();
	mockProgressDeleteMany.mockReset();
	mockProgressCreateMany.mockReset();
	mockProgressFindMany.mockReset();
	mockWordFindMany.mockReset();
	mockProgressCreateMany.mockResolvedValue({ count: 1 } as never);
	mockEnrollmentUpsert.mockResolvedValue({} as never);
});

describe('getSrsActiveWordIds', () => {
	it('reads the pool from active enrollments, so an unfollowed published set stays out', async () => {
		mockFindMany.mockResolvedValueOnce([
			{ wordId: 'w1' },
			{ wordId: 'w2' },
			{ wordId: 'w1' },
		] as never);
		const ids = await getSrsActiveWordIds('user-1');
		expect(ids).toEqual(new Set(['w1', 'w2']));
		expect(mockFindMany).toHaveBeenCalledWith({
			where: {
				wordId: { not: null },
				set: { enrollments: { some: { userId: 'user-1', srsActive: true } } },
			},
			select: { wordId: true },
		});
	});
});

describe('resolveSrsPoolWordIds', () => {
	it('heals null wordId items and includes legacy progress words', async () => {
		mockFindMany.mockResolvedValueOnce([
			{ id: 'i1', wordId: 'w1', rawTerm: '学习' },
			{ id: 'i2', wordId: null, rawTerm: '你好' },
		] as never);
		mockWordFindMany
			.mockResolvedValueOnce([{ id: 'w2', simplified: '你好' }] as never)
			.mockResolvedValueOnce([{ id: 'w2', simplified: '你好' }] as never);
		mockProgressFindMany.mockResolvedValueOnce([
			{ wordId: 'w3', word: { simplified: '学习' } },
		] as never);
		mockItemUpdate.mockResolvedValue({} as never);

		const ids = await resolveSrsPoolWordIds('user-1');

		expect(ids).toEqual(new Set(['w1', 'w2', 'w3']));
		expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
			where: { set: { enrollments: { some: { userId: 'user-1', srsActive: true } } } },
		}));
		expect(mockProgressFindMany).toHaveBeenCalledWith(expect.objectContaining({
			where: expect.objectContaining({
				userId: 'user-1',
				word: { simplified: { in: ['学习', '你好'] } },
			}),
		}));
		expect(mockItemUpdate).toHaveBeenCalledWith({
			where: { id: 'i2' },
			data: { wordId: 'w2' },
		});
	});
});

describe('getExclusiveWordIdsForSet', () => {
	it('returns words only in this set among sets the user is reviewing', async () => {
		mockSetFindFirst.mockResolvedValue(viewable as never);
		mockFindMany
			.mockResolvedValueOnce([{ wordId: 'w1' }, { wordId: 'w2' }, { wordId: 'w3' }] as never)
			.mockResolvedValueOnce([{ wordId: 'w2' }] as never);

		const exclusive = await getExclusiveWordIdsForSet('user-1', 'set-a');
		expect(exclusive).toEqual(['w1', 'w3']);
	});
});

describe('activateSetInSrs / deactivateSetFromSrs', () => {
	it('turns review on through the enrollment and does not write the set flag', async () => {
		mockSetFindFirst.mockResolvedValue({ ...viewable, shared: true } as never);
		mockFindMany.mockResolvedValueOnce([{ wordId: 'w1' }] as never);

		await activateSetInSrs('user-1', 'set-a');

		expect(mockEnrollmentUpsert).toHaveBeenCalledWith({
			where: { userId_setId: { userId: 'user-1', setId: 'set-a' } },
			create: { userId: 'user-1', setId: 'set-a', srsActive: true },
			update: { srsActive: true },
		});
		expect(mockSetUpdate).not.toHaveBeenCalled();
		expect(mockProgressCreateMany).toHaveBeenCalled();
	});

	it('turns review off without deleting progress', async () => {
		mockEnrollmentFindUnique.mockResolvedValueOnce({ id: 'enr' } as never);
		mockEnrollmentUpdate.mockResolvedValueOnce({} as never);

		await deactivateSetFromSrs('user-1', 'set-a');

		expect(mockEnrollmentUpdate).toHaveBeenCalledWith({
			where: { userId_setId: { userId: 'user-1', setId: 'set-a' } },
			data: { srsActive: false },
		});
		expect(mockProgressDeleteMany).not.toHaveBeenCalled();
		expect(mockSetUpdate).not.toHaveBeenCalled();
	});
});

describe('purgeSrsProgressForSet', () => {
	it('deletes progress for exclusive words only', async () => {
		mockSetFindFirst.mockResolvedValue(viewable as never);
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
	it('returns no purge when the user is not reviewing the set', async () => {
		mockEnrollmentFindUnique.mockResolvedValueOnce({ srsActive: false } as never);
		const preview = await previewRemoveWordFromSet('user-1', 'set-a', 'w1');
		expect(preview).toEqual({ wouldPurgeProgress: false, inOtherActiveSet: false });
	});

	it('returns purge when the word is exclusive to this review set', async () => {
		mockEnrollmentFindUnique.mockResolvedValueOnce({ srsActive: true } as never);
		mockFindMany.mockResolvedValueOnce([] as never);
		const preview = await previewRemoveWordFromSet('user-1', 'set-a', 'w1');
		expect(preview).toEqual({ wouldPurgeProgress: true, inOtherActiveSet: false });
	});
});
