/* ════════════════════════════════════════════════════════════════════════
   buildSampleWorkbook.ts — Build tu_vung Excel workbooks from sample data
   ════════════════════════════════════════════════════════════════════════ */
import * as XLSX from 'xlsx';
import {
	getHsk1SampleSet,
	type Hsk1SampleSet,
	type Hsk1SampleWord,
} from '@/lib/chinese/hsk1SampleSets';

const GUIDE_LINES = [
	['# HƯỚNG DẪN NHẬP TỪ VỰNG'],
	[''],
	['Sheet tu_vung — 7 cột:'],
	['bo_tu | simplified | pinyin | meaning_vi | han_viet | part_of_speech | ghi_chu'],
	[''],
	['Bắt buộc: bo_tu, simplified, pinyin, meaning_vi'],
	['Tùy chọn: han_viet, part_of_speech, ghi_chu'],
	[''],
	['Quy tắc:'],
	['- Mỗi dòng = 1 từ'],
	['- Cùng bo_tu → cùng bộ từ'],
	['- ghi_chu: mẹo nhớ, cách dùng, lưu ý'],
];

/** Representative rows for download template (diverse part-of-speech coverage). */
const DOWNLOAD_SAMPLE_SIMPLIFIED = ['你好', '我', '是', '老师', '谢谢'] as const;

const DOWNLOAD_SAMPLE_FILENAME = 'mau_tu_vung.xlsx';

function tuVungRows(set: Hsk1SampleSet, words?: Hsk1SampleWord[]): Record<string, string>[] {
	const source = words ?? set.words;
	return source.map((w) => ({
		bo_tu: set.boTu,
		simplified: w.simplified,
		pinyin: w.pinyin,
		meaning_vi: w.meaningVi,
		han_viet: w.hanViet,
		part_of_speech: w.partOfSpeech,
		ghi_chu: w.ghiChu,
	}));
}

function buildWorkbook(rows: Record<string, string>[]): Buffer {
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(
		wb,
		XLSX.utils.aoa_to_sheet(GUIDE_LINES),
		'huong_dan',
	);
	XLSX.utils.book_append_sheet(
		wb,
		XLSX.utils.json_to_sheet(rows),
		'tu_vung',
	);
	return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function buildSampleWorkbookFromSet(set: Hsk1SampleSet): Buffer {
	return buildWorkbook(tuVungRows(set));
}

/** Compact 5-row template for import UI download (format reference only). */
export function buildDownloadSampleWorkbook(): Buffer {
	const set = getHsk1SampleSet('bai1');
	const bySimplified = new Map(set.words.map((w) => [w.simplified, w]));
	const words = DOWNLOAD_SAMPLE_SIMPLIFIED.map((s) => bySimplified.get(s)).filter(
		(w): w is Hsk1SampleWord => !!w,
	);
	return buildWorkbook(tuVungRows(set, words));
}

export { DOWNLOAD_SAMPLE_FILENAME };
