import { describe, it, expect } from 'vitest';
import {
	buildUserSetSampleWorkbook,
	getUserSetSampleMeta,
	listUserSetSamples,
	resolveSampleSetId,
	USER_SET_SAMPLE_FILENAME,
} from '@/lib/chinese/userSetSampleWorkbook';
import { arraysFromExcelSheet, readExcelWorkbook, rowsFromExcelSheet } from '@/lib/excelWorkbook';
import { HSK1_SAMPLE_SETS } from '@/lib/chinese/hsk1SampleSets';
import { VI_DU_COLUMN_KEYS } from '@/lib/chinese/parseFillExample';

const TU_VUNG_COLUMNS = [
	'bo_tu',
	'simplified',
	'pinyin',
	'meaning_vi',
	'han_viet',
	'part_of_speech',
	'ghi_chu',
	...VI_DU_COLUMN_KEYS,
];

describe('userSetSampleWorkbook', () => {
	it('exposes canonical filename for backward compat', () => {
		expect(USER_SET_SAMPLE_FILENAME).toBe('hsk1_bai1_nihao_tu_vung.xlsx');
	});

	it('lists all 3 HSK1 sample workbooks', () => {
		const samples = listUserSetSamples();
		expect(samples).toHaveLength(3);
		expect(samples.map((s) => s.id)).toEqual(['bai1', 'bai2', 'bai3']);
	});

	it.each(HSK1_SAMPLE_SETS.map((s) => [s.id, s.boTu] as const))(
		'builds %s workbook with 12 columns and ~20 rows',
		async (setId, boTu) => {
			const meta = getUserSetSampleMeta(setId);
			const buffer = await buildUserSetSampleWorkbook(setId);
			const wb = await readExcelWorkbook(buffer);

			expect(wb.sheetNames).toContain('huong_dan');
			expect(wb.sheetNames).toContain('tu_vung');

			const guide = arraysFromExcelSheet(wb, 'huong_dan');
			expect(guide.some((row) => String(row[0]).includes('CÂU VÍ DỤ'))).toBe(true);
			expect(guide.some((row) => String(row[0]).includes('vi_du_1'))).toBe(true);

			const rows = rowsFromExcelSheet(wb, 'tu_vung') as Record<string, string>[];
			expect(rows.length).toBeGreaterThanOrEqual(18);
			expect(rows.length).toBeLessThanOrEqual(22);
			expect(Object.keys(rows[0]!).sort()).toEqual([...TU_VUNG_COLUMNS].sort());
			expect(rows.every((row) => row.bo_tu === boTu)).toBe(true);
			expect(rows.map((row) => row.simplified)).toEqual(meta.terms);
			expect(meta.title).toBe(boTu);
			expect(rows.every((row) => VI_DU_COLUMN_KEYS.every((k) => String(row[k] ?? '').trim()))).toBe(true);
		},
	);

	it('resolves sample set query param with bai1 default', () => {
		expect(resolveSampleSetId(null)).toBe('bai1');
		expect(resolveSampleSetId('bai3')).toBe('bai3');
		expect(resolveSampleSetId('invalid')).toBe('bai1');
	});
});
