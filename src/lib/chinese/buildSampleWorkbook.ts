/* ════════════════════════════════════════════════════════════════════════
   buildSampleWorkbook.ts — Build tu_vung Excel workbooks from sample data
   ════════════════════════════════════════════════════════════════════════ */
import * as XLSX from 'xlsx';
import type { Hsk1SampleSet } from '@/lib/chinese/hsk1SampleSets';

const GUIDE_LINES = [
	['# DỮ LIỆU MẪU — HSK1'],
	[''],
	['Sheet tu_vung — 7 cột:'],
	['bo_tu | simplified | pinyin | meaning_vi | han_viet | part_of_speech | ghi_chu'],
	[''],
	['Cột bắt buộc: bo_tu, simplified, pinyin, meaning_vi'],
	['Cột tùy chọn: han_viet, part_of_speech, ghi_chu'],
	[''],
	['Mỗi dòng là một từ. Cùng bo_tu → cùng một bộ từ.'],
	['ghi_chu: mẹo nhớ, cách dùng, lưu ý dễ nhầm.'],
];

function tuVungRows(set: Hsk1SampleSet): Record<string, string>[] {
	return set.words.map((w) => ({
		bo_tu: set.boTu,
		simplified: w.simplified,
		pinyin: w.pinyin,
		meaning_vi: w.meaningVi,
		han_viet: w.hanViet,
		part_of_speech: w.partOfSpeech,
		ghi_chu: w.ghiChu,
	}));
}

export function buildSampleWorkbookFromSet(set: Hsk1SampleSet): Buffer {
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(
		wb,
		XLSX.utils.aoa_to_sheet(GUIDE_LINES),
		'huong_dan',
	);
	XLSX.utils.book_append_sheet(
		wb,
		XLSX.utils.json_to_sheet(tuVungRows(set)),
		'tu_vung',
	);
	return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
