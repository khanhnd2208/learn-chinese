import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
	buildUserSetSampleWorkbook,
	getUserSetSampleMeta,
	USER_SET_SAMPLE_FILENAME,
} from '@/lib/chinese/userSetSampleWorkbook';

describe('userSetSampleWorkbook', () => {
	it('exposes canonical filename', () => {
		expect(USER_SET_SAMPLE_FILENAME).toBe('hsk1_bai1_nihao_tu_vung.xlsx');
	});

	it('includes huong_dan and tu_vung with HSK1 Bài 1 sample rows', () => {
		const meta = getUserSetSampleMeta();
		const buffer = buildUserSetSampleWorkbook();
		const wb = XLSX.read(buffer, { type: 'buffer' });
		expect(wb.SheetNames).toContain('huong_dan');
		expect(wb.SheetNames).toContain('tu_vung');

		const guide = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.huong_dan, { header: 1 });
		expect(guide.some((row) => String(row[0]).includes('# DỮ LIỆU MẪU'))).toBe(true);

		const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets.tu_vung);
		expect(rows).toHaveLength(31);
		expect(rows.map((row) => row.simplified)).toEqual(meta.terms);
		expect(meta.title).toBe('HSK1 Bài 1 - 你好');
		expect(meta.terms[0]).toBe('你');
		expect(meta.terms.at(-1)).toBe('花');
	});
});
