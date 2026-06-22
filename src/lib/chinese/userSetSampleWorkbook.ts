import { readFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';

export const USER_SET_SAMPLE_FILENAME = 'hsk1_bai1_nihao_tu_vung.xlsx';

const SAMPLE_PATH = join(process.cwd(), 'assets/sample', USER_SET_SAMPLE_FILENAME);

let cachedBuffer: Buffer | null = null;

/** Canonical import template — HSK1 Bài 1 你好 (31 từ, admin-curated). */
export function buildUserSetSampleWorkbook(): Buffer {
	if (!cachedBuffer) {
		cachedBuffer = readFileSync(SAMPLE_PATH);
	}
	return cachedBuffer;
}

export interface UserSetSampleMeta {
	title: string;
	terms: string[];
}

/** Metadata derived from sheet tu_vung — for verify scripts / tests. */
export function getUserSetSampleMeta(): UserSetSampleMeta {
	const wb = XLSX.read(buildUserSetSampleWorkbook(), { type: 'buffer' });
	const rows = XLSX.utils.sheet_to_json<{ bo_tu?: string; simplified?: string }>(
		wb.Sheets.tu_vung,
		{ defval: '' },
	);
	const title = String(rows[0]?.bo_tu ?? 'HSK1 Bài 1 - 你好').trim();
	const terms = rows
		.map((row) => String(row.simplified ?? '').trim())
		.filter(Boolean);
	return { title, terms };
}
