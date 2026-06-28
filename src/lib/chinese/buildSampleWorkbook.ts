/* ════════════════════════════════════════════════════════════════════════
   buildSampleWorkbook.ts — Build tu_vung Excel workbooks from sample data
   ════════════════════════════════════════════════════════════════════════ */
import {
	getHsk1SampleSet,
	type Hsk1SampleSet,
	type Hsk1SampleWord,
} from '@/lib/chinese/hsk1SampleSets';
import { buildExcelWorkbookBuffer } from '@/lib/excelWorkbook';
import { buildFiveFillExampleCells } from '@/lib/chinese/sampleFillExamples';
import { VI_DU_COLUMN_KEYS } from '@/lib/chinese/parseFillExample';
import { TU_VUNG_IMPORT_GUIDE_LINES } from '@/lib/chinese/tuVungImportGuide';

/** Representative rows for download template (diverse part-of-speech coverage). */
const DOWNLOAD_SAMPLE_SIMPLIFIED = ['你好', '我', '是', '老师', '谢谢'] as const;

const DOWNLOAD_SAMPLE_FILENAME = 'mau_tu_vung.xlsx';

function tuVungRows(set: Hsk1SampleSet, words?: Hsk1SampleWord[]): Record<string, string>[] {
	const source = words ?? set.words;
	return source.map((w) => {
		const examples = w.examples?.length === 5 ? w.examples : buildFiveFillExampleCells(w);
		const row: Record<string, string> = {
			bo_tu: set.boTu,
			simplified: w.simplified,
			pinyin: w.pinyin,
			meaning_vi: w.meaningVi,
			han_viet: w.hanViet,
			part_of_speech: w.partOfSpeech,
			ghi_chu: w.ghiChu,
		};
		VI_DU_COLUMN_KEYS.forEach((key, i) => {
			row[key] = examples[i] ?? '';
		});
		return row;
	});
}

function buildWorkbook(rows: Record<string, string>[]): Promise<Buffer> {
	return buildExcelWorkbookBuffer([
		{ name: 'huong_dan', arrays: TU_VUNG_IMPORT_GUIDE_LINES },
		{ name: 'tu_vung', rows },
	]);
}

export function buildSampleWorkbookFromSet(set: Hsk1SampleSet): Promise<Buffer> {
	return buildWorkbook(tuVungRows(set));
}

/** Compact 5-row template for import UI download (format reference only). */
export function buildDownloadSampleWorkbook(): Promise<Buffer> {
	const set = getHsk1SampleSet('bai1');
	const bySimplified = new Map(set.words.map((w) => [w.simplified, w]));
	const words = DOWNLOAD_SAMPLE_SIMPLIFIED.map((s) => bySimplified.get(s)).filter(
		(w): w is Hsk1SampleWord => !!w,
	);
	return buildWorkbook(tuVungRows(set, words));
}

export { DOWNLOAD_SAMPLE_FILENAME };
