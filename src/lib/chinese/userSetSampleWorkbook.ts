/* ════════════════════════════════════════════════════════════════════════
   userSetSampleWorkbook.ts — Serve HSK1 sample workbooks for download
   ════════════════════════════════════════════════════════════════════════ */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import { buildSampleWorkbookFromSet } from '@/lib/chinese/buildSampleWorkbook';
import {
	HSK1_SAMPLE_SETS,
	getHsk1SampleSet,
	parseHsk1SampleSetId,
	type Hsk1SampleSetId,
} from '@/lib/chinese/hsk1SampleSets';

/** @deprecated Use getHsk1SampleSet('bai1').filename */
export const USER_SET_SAMPLE_FILENAME = 'hsk1_bai1_nihao_tu_vung.xlsx';

const SAMPLE_DIR = join(process.cwd(), 'assets/sample');

const bufferCache = new Map<Hsk1SampleSetId, Buffer>();

function samplePath(id: Hsk1SampleSetId): string {
	return join(SAMPLE_DIR, getHsk1SampleSet(id).filename);
}

function loadSampleBuffer(id: Hsk1SampleSetId): Buffer {
	const cached = bufferCache.get(id);
	if (cached) return cached;

	const path = samplePath(id);
	const buffer = existsSync(path)
		? readFileSync(path)
		: buildSampleWorkbookFromSet(getHsk1SampleSet(id));

	bufferCache.set(id, buffer);
	return buffer;
}

export function buildUserSetSampleWorkbook(setId: Hsk1SampleSetId = 'bai1'): Buffer {
	return loadSampleBuffer(setId);
}

export interface UserSetSampleMeta {
	id: Hsk1SampleSetId;
	filename: string;
	title: string;
	terms: string[];
}

export function getUserSetSampleMeta(setId: Hsk1SampleSetId = 'bai1'): UserSetSampleMeta {
	const set = getHsk1SampleSet(setId);
	const wb = XLSX.read(loadSampleBuffer(setId), { type: 'buffer' });
	const rows = XLSX.utils.sheet_to_json<{ bo_tu?: string; simplified?: string }>(
		wb.Sheets.tu_vung,
		{ defval: '' },
	);
	return {
		id: setId,
		filename: set.filename,
		title: String(rows[0]?.bo_tu ?? set.boTu).trim(),
		terms: rows.map((row) => String(row.simplified ?? '').trim()).filter(Boolean),
	};
}

export function listUserSetSamples(): UserSetSampleMeta[] {
	return HSK1_SAMPLE_SETS.map((s) => getUserSetSampleMeta(s.id));
}

export function resolveSampleSetId(query: string | null | undefined): Hsk1SampleSetId {
	try {
		return parseHsk1SampleSetId(query);
	} catch {
		return 'bai1';
	}
}

export { HSK1_SAMPLE_SETS, parseHsk1SampleSetId };
