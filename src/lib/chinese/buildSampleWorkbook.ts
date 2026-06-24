/* ════════════════════════════════════════════════════════════════════════
   buildSampleWorkbook.ts — Build tu_vung Excel workbooks from sample data
   ════════════════════════════════════════════════════════════════════════ */
import * as XLSX from 'xlsx';
import {
	getHsk1SampleSet,
	type Hsk1SampleSet,
	type Hsk1SampleWord,
} from '@/lib/chinese/hsk1SampleSets';
import { buildFiveFillExampleCells } from '@/lib/chinese/sampleFillExamples';
import { VI_DU_COLUMN_KEYS } from '@/lib/chinese/parseFillExample';

const GUIDE_LINES = [
	['# HƯỚNG DẪN NHẬP TỪ VỰNG + CÂU VÍ DỤ (CHO AI / NGƯỜI NHẬP LIỆU)'],
	[''],
	['Sheet tu_vung — 12 cột:'],
	['bo_tu | simplified | pinyin | meaning_vi | han_viet | part_of_speech | ghi_chu | vi_du_1 | vi_du_2 | vi_du_3 | vi_du_4 | vi_du_5'],
	[''],
	['Cột bắt buộc: bo_tu, simplified, pinyin, meaning_vi, vi_du_1 … vi_du_5 (đủ 5 ví dụ hợp lệ)'],
	['Cột tùy chọn: han_viet, part_of_speech, ghi_chu'],
	[''],
	['Định dạng mỗi ô vi_du_N (3 phần, phân tách bằng dấu |):'],
	['  câu Hán có __ | pinyin cả câu | câu nghĩa tiếng Việt có __'],
	[''],
	['Quy tắc câu Hán:'],
	['- Đúng MỘT chỗ __ thay cho từ mục tiêu (cột simplified)'],
	['- Từ simplified KHÔNG được xuất hiện ở chỗ khác trong câu'],
	['- Câu ngắn, tự nhiên, phù hợp HSK1–2, tối đa ~28 chữ Hán'],
	[''],
	['Quy tắc câu nghĩa Việt:'],
	['- Đúng MỘT chỗ __ tại vị trí nghĩa của từ (dùng meaning_vi)'],
	['- Chỉ là gợi ý ngữ cảnh khi học — app tự điền khi xem đáp án'],
	[''],
	['Ví dụ cho từ simplified = 老师, meaning_vi = giáo viên:'],
	['  他是__。|tā shì __.|Anh ấy là __.'],
	[''],
	['Quy tắc bộ từ:'],
	['- Mỗi dòng = 1 từ'],
	['- Cùng bo_tu → cùng bộ từ'],
	['- Mỗi từ PHẢI có đủ 5 ví dụ hợp lệ — thiếu sẽ bị từ chối import'],
	[''],
	['⚠ Từ đặc thù (số đếm, tháng, thứ, lượng từ, đại từ nhân xưng...):'],
	['  5 câu ví dụ PHẢI thể hiện ngữ cảnh ĐẶC TRƯNG của từ — không được dùng'],
	['  câu mà thay blank bằng từ khác cũng đúng về nghĩa.'],
	['  Sai (quá chung): 我有__个苹果  (điền 1/2/3... đều được)'],
	['  Đúng (buộc đúng từ): 今天星期__。 / 现在__点半。 / 第__课'],
	['  → Học viên phải nhớ đúng từ, không đoán mò.'],
];

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
