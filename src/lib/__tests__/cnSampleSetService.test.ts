import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HSK1_SAMPLE_SETS } from '@/lib/chinese/hsk1SampleSets';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWordSet: {
			findMany: vi.fn(),
		},
	},
}));

vi.mock('@/services/chinese/cnExcelService', () => ({
	importUserWorkbookBuffer: vi.fn(),
}));

vi.mock('@/services/chinese/cnSrsEnrollmentService', () => ({
	activateSetInSrs: vi.fn(),
}));

vi.mock('@/lib/chinese/userSetSampleWorkbook', () => ({
	buildUserSetSampleWorkbook: vi.fn(() => Buffer.from('sample-xlsx')),
}));

import { prisma } from '@/lib/prisma';
import { importUserWorkbookBuffer } from '@/services/chinese/cnExcelService';
import { activateSetInSrs } from '@/services/chinese/cnSrsEnrollmentService';
import { buildUserSetSampleWorkbook } from '@/lib/chinese/userSetSampleWorkbook';
import { ensureGlobalSampleSets } from '@/services/chinese/cnSampleSetService';

const mockFindMany = vi.mocked(prisma.cnWordSet.findMany);
const mockImport = vi.mocked(importUserWorkbookBuffer);
const mockActivate = vi.mocked(activateSetInSrs);
const mockBuildWorkbook = vi.mocked(buildUserSetSampleWorkbook);

beforeEach(() => {
	mockFindMany.mockReset();
	mockImport.mockReset();
	mockActivate.mockReset();
	mockBuildWorkbook.mockReset();
	mockBuildWorkbook.mockReturnValue(Buffer.from('sample-xlsx'));
});

describe('ensureGlobalSampleSets', () => {
	it('imports and activates missing sample sets', async () => {
		mockFindMany.mockResolvedValueOnce([]);
		let setCounter = 0;
		mockImport.mockImplementation(async () =>
			({
				preview: { errors: [] },
				createdSetIds: [`set-${++setCounter}`],
			}) as never,
		);

		await ensureGlobalSampleSets('user-1');

		expect(mockImport).toHaveBeenCalledTimes(3);
		expect(mockActivate).toHaveBeenCalledTimes(3);
		expect(mockBuildWorkbook).toHaveBeenCalledWith('bai1');
		expect(mockBuildWorkbook).toHaveBeenCalledWith('bai2');
		expect(mockBuildWorkbook).toHaveBeenCalledWith('bai3');
	});

	it('skips import when all sets already exist with SRS active', async () => {
		mockFindMany.mockResolvedValueOnce(
			HSK1_SAMPLE_SETS.map((s, i) => ({
				id: `existing-${i}`,
				title: s.boTu,
				srsActive: true,
			})) as never,
		);

		await ensureGlobalSampleSets('user-1');

		expect(mockImport).not.toHaveBeenCalled();
		expect(mockActivate).not.toHaveBeenCalled();
	});

	it('activates SRS for existing sets missing srsActive', async () => {
		mockFindMany.mockResolvedValueOnce([
			{ id: 'set-bai1', title: HSK1_SAMPLE_SETS[0]!.boTu, srsActive: false },
		] as never);
		mockImport.mockImplementation(async () =>
			({
				preview: { errors: [] },
				createdSetIds: ['set-bai2', 'set-bai3'],
			}) as never,
		);

		await ensureGlobalSampleSets('user-1');

		expect(mockActivate).toHaveBeenCalledWith('user-1', 'set-bai1');
		expect(mockImport).toHaveBeenCalledTimes(2);
		expect(mockActivate).toHaveBeenCalledWith('user-1', 'set-bai2');
		expect(mockActivate).toHaveBeenCalledWith('user-1', 'set-bai3');
	});
});
