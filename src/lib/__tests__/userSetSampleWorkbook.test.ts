import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
	buildUserSetSampleWorkbook,
	getUserSetSampleMeta,
	listUserSetSamples,
	resolveSampleSetId,
	USER_SET_SAMPLE_FILENAME,
} from '@/lib/chinese/userSetSampleWorkbook';
import { HSK1_SAMPLE_SETS } from '@/lib/chinese/hsk1SampleSets';

const TU_VUNG_COLUMNS = [
	'bo_tu',
	'simplified',
	'pinyin',
	'meaning_vi',
	'han_viet',
	'part_of_speech',
	'ghi_chu',
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
		'builds %s workbook with 7 columns and ~20 rows',
		(setId, boTu) => {
			const meta = getUserSetSampleMeta(setId);
			const buffer = buildUserSetSampleWorkbook(setId);
			const wb = XLSX.read(buffer, { type: 'buffer' });

			expect(wb.SheetNames).toContain('huong_dan');
			expect(wb.SheetNames).toContain('tu_vung');

			const guide = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.huong_dan, { header: 1 });
			expect(guide.some((row) => String(row[0]).includes('# DỮ LIỆU MẪU'))).toBe(true);
			expect(guide.some((row) => String(row[0]).includes('7 cột'))).toBe(true);

			const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets.tu_vung);
			expect(rows.length).toBeGreaterThanOrEqual(18);
			expect(rows.length).toBeLessThanOrEqual(22);
			expect(Object.keys(rows[0]!).sort()).toEqual([...TU_VUNG_COLUMNS].sort());
			expect(rows.every((row) => row.bo_tu === boTu)).toBe(true);
			expect(rows.map((row) => row.simplified)).toEqual(meta.terms);
			expect(meta.title).toBe(boTu);
		},
	);

	it('resolves sample set query param with bai1 default', () => {
		expect(resolveSampleSetId(null)).toBe('bai1');
		expect(resolveSampleSetId('bai3')).toBe('bai3');
		expect(resolveSampleSetId('invalid')).toBe('bai1');
	});
});
