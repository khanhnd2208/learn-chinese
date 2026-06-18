import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	getExclusiveWordIdsForSet,
	getSrsActiveWordIds,
} from '@/services/chinese/cnSrsEnrollmentService';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordSetItem: {
			findMany: vi.fn(),
		},
	},
}));

import { prisma } from '@/lib/prisma';

const mockFindMany = vi.mocked(prisma.cnWordSetItem.findMany);

beforeEach(() => {
	mockFindMany.mockReset();
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
		expect(mockFindMany).toHaveBeenCalledWith({
			where: {
				wordId: { not: null },
				set: { userId: 'user-1', srsActive: true },
			},
			select: { wordId: true },
		});
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

	it('returns all set words when no overlap with other active sets', async () => {
		mockFindMany
			.mockResolvedValueOnce([{ wordId: 'w1' }] as never)
			.mockResolvedValueOnce([] as never);

		const exclusive = await getExclusiveWordIdsForSet('user-1', 'set-a');
		expect(exclusive).toEqual(['w1']);
	});
});
