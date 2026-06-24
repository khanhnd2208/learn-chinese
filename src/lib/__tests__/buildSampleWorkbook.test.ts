import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
	buildDownloadSampleWorkbook,
	buildSampleWorkbookFromSet,
} from '@/lib/chinese/buildSampleWorkbook';
import { getHsk1SampleSet } from '@/lib/chinese/hsk1SampleSets';
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

describe('buildSampleWorkbook', () => {
	it('builds compact download template with 5 rows and guide sheet', () => {
		const buffer = buildDownloadSampleWorkbook();
		const wb = XLSX.read(buffer, { type: 'buffer' });

		expect(wb.SheetNames).toContain('huong_dan');
		expect(wb.SheetNames).toContain('tu_vung');

		const guide = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.huong_dan, { header: 1 });
		expect(guide.some((row) => String(row[0]).includes('CÂU VÍ DỤ'))).toBe(true);
		expect(guide.some((row) => String(row[0]).includes('vi_du_1'))).toBe(true);
		expect(guide.some((row) => String(row[0]).includes('Từ đặc thù'))).toBe(true);

		const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets.tu_vung);
		expect(rows).toHaveLength(5);
		expect(Object.keys(rows[0]!).sort()).toEqual([...TU_VUNG_COLUMNS].sort());
		expect(rows.map((r) => r.simplified)).toEqual(['你好', '我', '是', '老师', '谢谢']);
		for (const row of rows) {
			expect(VI_DU_COLUMN_KEYS.every((k) => String(row[k] ?? '').trim())).toBe(true);
		}
	});

	it('builds full workbook from set for provisioning', () => {
		const set = getHsk1SampleSet('bai1');
		const buffer = buildSampleWorkbookFromSet(set);
		const wb = XLSX.read(buffer, { type: 'buffer' });
		const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets.tu_vung);
		expect(rows.length).toBeGreaterThanOrEqual(18);
		expect(rows.every((row) => row.bo_tu === set.boTu)).toBe(true);
		expect(rows.every((row) => VI_DU_COLUMN_KEYS.every((k) => String(row[k] ?? '').trim()))).toBe(true);
	});
});
