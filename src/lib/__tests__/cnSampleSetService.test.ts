import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HSK1_SAMPLE_SETS } from '@/lib/chinese/hsk1SampleSets';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordSet: {
			findMany: vi.fn(),
			update: vi.fn(),
		},
	},
}));

vi.mock('@/services/chinese/cnExcelService', () => ({
	importUserWorkbookBuffer: vi.fn(),
}));

vi.mock('@/lib/chinese/userSetSampleWorkbook', () => ({
	buildUserSetSampleWorkbook: vi.fn(async () => Buffer.from('sample-xlsx')),
}));

import { prisma } from '@/lib/prisma';
import { importUserWorkbookBuffer } from '@/services/chinese/cnExcelService';
import { buildUserSetSampleWorkbook } from '@/lib/chinese/userSetSampleWorkbook';
import { ensureGlobalSampleSets } from '@/services/chinese/cnSampleSetService';

const mockFindMany = vi.mocked(prisma.cnWordSet.findMany);
const mockUpdate = vi.mocked(prisma.cnWordSet.update);
const mockImport = vi.mocked(importUserWorkbookBuffer);
const mockBuildWorkbook = vi.mocked(buildUserSetSampleWorkbook);

beforeEach(() => {
	mockFindMany.mockReset();
	mockUpdate.mockReset();
	mockImport.mockReset();
	mockBuildWorkbook.mockReset();
	mockBuildWorkbook.mockResolvedValue(Buffer.from('sample-xlsx'));
	mockUpdate.mockResolvedValue({} as never);
});

describe('ensureGlobalSampleSets', () => {
	it('imports missing starter sets as published HSK1 sets and does not copy them per learner', async () => {
		mockFindMany.mockResolvedValueOnce([]);
		let setCounter = 0;
		mockImport.mockImplementation(async () =>
			({
				preview: { errors: [] },
				createdSetIds: [`set-${++setCounter}`],
			}) as never,
		);

		await ensureGlobalSampleSets('admin-1');

		expect(mockImport).toHaveBeenCalledTimes(3);
		expect(mockImport).toHaveBeenCalledWith('admin-1', expect.any(Buffer), expect.objectContaining({
			canCreateWords: true,
		}));
		expect(mockBuildWorkbook).toHaveBeenCalledWith('bai1');
		expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
			where: { id: 'set-1' },
			data: expect.objectContaining({ shared: true, level: 1, sortOrder: 1 }),
		}));
	});

	it('skips import when the published starter sets already exist', async () => {
		mockFindMany.mockResolvedValueOnce(
			HSK1_SAMPLE_SETS.map((sample, index) => ({
				id: `existing-${index}`,
				title: sample.boTu,
				userId: 'admin-1',
				shared: true,
				level: 1,
				sortOrder: index + 1,
				publishedAt: new Date('2026-01-01'),
			})) as never,
		);

		await ensureGlobalSampleSets('admin-1');

		expect(mockImport).not.toHaveBeenCalled();
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('publishes an admin starter set that is still a draft', async () => {
		mockFindMany.mockResolvedValueOnce([
			{
				id: 'set-bai1',
				title: HSK1_SAMPLE_SETS[0]!.boTu,
				userId: 'admin-1',
				shared: false,
				level: null,
				sortOrder: 0,
				publishedAt: null,
			},
		] as never);
		mockImport.mockImplementation(async () =>
			({
				preview: { errors: [] },
				createdSetIds: ['set-bai2'],
			}) as never,
		);

		await ensureGlobalSampleSets('admin-1');

		expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
			where: { id: 'set-bai1' },
			data: expect.objectContaining({ shared: true, level: 1, userId: 'admin-1' }),
		}));
		expect(mockImport).toHaveBeenCalledTimes(2);
	});
});
