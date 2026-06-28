import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MAX_CN_TERMS_PER_SET } from '@/config/constants';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordSet: {
			create: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		cnWordProgress: {
			findMany: vi.fn(),
		},
	},
}));

import { prisma } from '@/lib/prisma';
import {
	addTermsToSet,
	duplicateSharedSet,
	duplicateUserSet,
	getUserSet,
	setSharedStatus,
	updateUserSet,
} from '@/services/chinese/cnSetService';

const mockFindFirst = vi.mocked(prisma.cnWordSet.findFirst);
const mockCreate = vi.mocked(prisma.cnWordSet.create);
const mockUpdate = vi.mocked(prisma.cnWordSet.update);

beforeEach(() => {
	mockFindFirst.mockReset();
	mockCreate.mockReset();
	mockUpdate.mockReset();
});

describe('addTermsToSet', () => {
	it('rejects additions that would exceed MAX_CN_TERMS_PER_SET', async () => {
		mockFindFirst.mockResolvedValue({
			id: 'set-1',
			userId: 'user-1',
			title: 'Bài quá dài',
			description: '',
			source: 'manual',
			srsActive: false,
			shared: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			items: Array.from({ length: MAX_CN_TERMS_PER_SET }, (_, i) => ({
				rawTerm: `词${i}`,
			})),
		} as never);

		await expect(addTermsToSet('user-1', 'set-1', ['新词']))
			.rejects
			.toThrow(`Không quá ${MAX_CN_TERMS_PER_SET} từ mỗi bộ`);
	});
});

describe('set ownership guards', () => {
	it('does not read a set unless it belongs to the user', async () => {
		mockFindFirst.mockResolvedValue(null);

		await expect(getUserSet('user-1', 'set-other')).resolves.toBeNull();
		expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
			where: { id: 'set-other', userId: 'user-1' },
		}));
	});

	it('does not update another user set', async () => {
		mockFindFirst.mockResolvedValue(null);

		await expect(updateUserSet('user-1', 'set-other', { title: 'Không được sửa' }))
			.resolves
			.toBeNull();
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('does not duplicate another user private set', async () => {
		mockFindFirst.mockResolvedValue(null);

		await expect(duplicateUserSet('user-1', 'set-other')).resolves.toBeNull();
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('does not share or unshare a set unless it belongs to the admin user', async () => {
		mockFindFirst.mockResolvedValue(null);

		await expect(setSharedStatus('admin-1', 'set-other', true)).resolves.toBeNull();
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('duplicates a shared set into the requesting user account as private', async () => {
		const now = new Date();
		mockFindFirst
			.mockResolvedValueOnce({
				id: 'shared-1',
				userId: 'admin-1',
				title: 'Bài chia sẻ',
				description: 'Public',
				source: 'manual',
				srsActive: true,
				shared: true,
				createdAt: now,
				updatedAt: now,
				items: [{ rawTerm: '你', wordId: null }],
			} as never)
			.mockResolvedValueOnce({
				id: 'copy-1',
				userId: 'user-1',
				title: 'Bài chia sẻ (từ thư viện)',
				description: 'Public',
				source: 'manual',
				srsActive: false,
				shared: false,
				createdAt: now,
				updatedAt: now,
				items: [],
			} as never);
		mockCreate.mockResolvedValue({ id: 'copy-1' } as never);

		const copy = await duplicateSharedSet('user-1', 'shared-1');

		expect(mockCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				userId: 'user-1',
				shared: false,
				srsActive: false,
			}),
		});
		expect(copy?.shared).toBe(false);
	});
});
