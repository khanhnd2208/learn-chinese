import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordSet: { findFirst: vi.fn() },
		cnWordSetItem: { findMany: vi.fn() },
		cnSetEnrollment: {
			upsert: vi.fn(),
			deleteMany: vi.fn(),
			findMany: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		cnWordProgress: {
			createMany: vi.fn(),
			deleteMany: vi.fn(),
		},
	},
}));

import { prisma } from '@/lib/prisma';
import {
	canViewSet,
	enrollInSet,
	enrollNewWordsForActiveFollowers,
	unenrollFromSet,
} from '@/services/chinese/cnEnrollmentService';

const mockSetFindFirst = vi.mocked(prisma.cnWordSet.findFirst);
const mockItems = vi.mocked(prisma.cnWordSetItem.findMany);
const mockUpsert = vi.mocked(prisma.cnSetEnrollment.upsert);
const mockDeleteEnrollment = vi.mocked(prisma.cnSetEnrollment.deleteMany);
const mockEnrollmentFindMany = vi.mocked(prisma.cnSetEnrollment.findMany);
const mockProgressCreate = vi.mocked(prisma.cnWordProgress.createMany);
const mockProgressDelete = vi.mocked(prisma.cnWordProgress.deleteMany);

beforeEach(() => {
	vi.clearAllMocks();
	mockUpsert.mockResolvedValue({} as never);
	mockItems.mockResolvedValue([{ wordId: 'w1' }] as never);
	mockProgressCreate.mockResolvedValue({ count: 1 } as never);
});

describe('canViewSet', () => {
	it('allows the owner, a published set, or an existing enrollment', async () => {
		mockSetFindFirst.mockResolvedValueOnce({ userId: 'user-1', shared: false, enrollments: [] } as never);
		await expect(canViewSet('user-1', 'set-a')).resolves.toBe(true);

		mockSetFindFirst.mockResolvedValueOnce({ userId: 'admin', shared: true, enrollments: [] } as never);
		await expect(canViewSet('user-1', 'set-a')).resolves.toBe(true);

		mockSetFindFirst.mockResolvedValueOnce({
			userId: 'admin',
			shared: false,
			enrollments: [{ id: 'enr' }],
		} as never);
		await expect(canViewSet('user-1', 'set-a')).resolves.toBe(true);

		mockSetFindFirst.mockResolvedValueOnce({ userId: 'admin', shared: false, enrollments: [] } as never);
		await expect(canViewSet('user-1', 'set-a')).resolves.toBe(false);

		mockSetFindFirst.mockResolvedValueOnce(null);
		await expect(canViewSet('user-1', 'missing')).resolves.toBe(false);
	});
});

describe('enrollInSet / unenrollFromSet', () => {
	it('follows a published set and keeps existing progress rows', async () => {
		mockSetFindFirst.mockResolvedValue({
			id: 'set-a',
			userId: 'admin',
			shared: true,
			enrollments: [],
		} as never);

		await enrollInSet('learner', 'set-a');

		expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
			where: { userId_setId: { userId: 'learner', setId: 'set-a' } },
			create: { userId: 'learner', setId: 'set-a', srsActive: true },
		}));
		expect(mockProgressCreate).toHaveBeenCalledWith(expect.objectContaining({
			skipDuplicates: true,
			data: [expect.objectContaining({ userId: 'learner', wordId: 'w1' })],
		}));

		mockDeleteEnrollment.mockResolvedValueOnce({ count: 1 } as never);
		await expect(unenrollFromSet('learner', 'set-a')).resolves.toEqual({ removed: true });
		expect(mockProgressDelete).not.toHaveBeenCalled();
	});

	it('refuses to follow a private set owned by someone else', async () => {
		mockSetFindFirst.mockResolvedValueOnce({ id: 'set-a', userId: 'admin', shared: false } as never);
		await expect(enrollInSet('learner', 'set-a')).rejects.toThrow('chưa được xuất bản');
		expect(mockUpsert).not.toHaveBeenCalled();
		expect(mockProgressDelete).not.toHaveBeenCalled();
	});
});

describe('enrollNewWordsForActiveFollowers', () => {
	it('enrolls new words for followers of a published set', async () => {
		mockSetFindFirst.mockResolvedValueOnce({ shared: true } as never);
		mockEnrollmentFindMany.mockResolvedValueOnce([
			{ userId: 'learner-1' },
			{ userId: 'learner-2' },
		] as never);

		const followers = await enrollNewWordsForActiveFollowers('set-a', ['w-new', 'w-new']);

		expect(followers).toBe(2);
		expect(mockEnrollmentFindMany).toHaveBeenCalledWith({
			where: { setId: 'set-a', srsActive: true },
			select: { userId: true },
		});
		expect(mockProgressCreate).toHaveBeenCalledTimes(2);
		expect(mockProgressCreate).toHaveBeenCalledWith(expect.objectContaining({
			skipDuplicates: true,
			data: [expect.objectContaining({ userId: 'learner-1', wordId: 'w-new' })],
		}));
	});

	it('does not enroll followers when the set is still a draft', async () => {
		mockSetFindFirst.mockResolvedValueOnce({ shared: false } as never);
		await expect(enrollNewWordsForActiveFollowers('set-a', ['w-new'])).resolves.toBe(0);
		expect(mockEnrollmentFindMany).not.toHaveBeenCalled();
		expect(mockProgressCreate).not.toHaveBeenCalled();
	});
});
