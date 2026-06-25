/* ════════════════════════════════════════════════════════════════════════
   aiImportPrompt.ts — AI Smart Import prompt builder & TSV paste parser
   ════════════════════════════════════════════════════════════════════════ */
import { AppError } from '@/lib/appError';
import { VI_DU_COLUMN_KEYS } from '@/lib/chinese/parseFillExample';
import { TU_VUNG_IMPORT_GUIDE_TEXT } from '@/lib/chinese/tuVungImportGuide';

export const AI_IMPORT_GUIDE_TEXT = TU_VUNG_IMPORT_GUIDE_TEXT;

/** TSV columns the AI must output (bo_tu is assigned by the app). */
export const AI_IMPORT_TSV_COLUMNS = [
	'simplified',
	'pinyin',
	'meaning_vi',
	'han_viet',
	'part_of_speech',
	'ghi_chu',
	...VI_DU_COLUMN_KEYS,
] as const;

export const AI_IMPORT_OUTPUT_SPEC = [
	'## ĐỊNH DẠNG OUTPUT (BẮT BUỘC)',
	'',
	'Chỉ trả về MỘT khối TSV (tab-separated values) bọc trong code fence ```tsv … ```.',
	'KHÔNG thêm giải thích trước/sau code block. KHÔNG dùng bảng markdown. KHÔNG dùng CSV (dấu phẩy).',
	'Chỉ dùng TAB giữa các cột. Người dùng sẽ copy bằng nút "Copy code" — giữ nguyên [BLANK] trong output.',
	'',
	'Trong output TSV, dùng token [BLANK] thay cho mọi dấu __ minh họa ở PHẦN 1.',
	'',
	'🚨 QUY TẮC BẮT BUỘC — KHÔNG ĐƯỢC VI PHẠM:',
	'Trong câu Hán, PHẢI có đúng 1 dấu [BLANK] thay cho từ mục tiêu.',
	'KHÔNG được xóa từ mà không thay bằng [BLANK]. KHÔNG được để câu Hán không có [BLANK].',
	'',
	'Từ đứng ĐẦU câu — ví dụ cho 你:',
	'  ❌ SAI: 好吗？ (xóa 你, không có [BLANK])',
	'  ✓ ĐÚNG: [BLANK]好吗？|[BLANK] hǎo ma?|[BLANK] khỏe không?',
	'',
	'Từ đứng CUỐI câu — ví dụ cho 老师:',
	'  ❌ SAI: 他是。 (xóa 老师, không có [BLANK])',
	'  ✓ ĐÚNG: 他是[BLANK]。|tā shì [BLANK].|Anh ấy là [BLANK].',
	'',
	'🚨 LỖI HAY GẶP — TỪ MỤC TIÊU BỊ LẶP / BLANK LỆCH VỊ TRÍ:',
	'- THAY THẾ từ mục tiêu bằng [BLANK]. KHÔNG viết cả từ mục tiêu LẪN [BLANK].',
	'- Từ mục tiêu chỉ xuất hiện ĐÚNG 1 LẦN trong câu Hán — tại [BLANK], KHÔNG ở chỗ khác.',
	'- Vị trí [BLANK] ở câu Hán, pinyin, câu Việt phải TRÙNG nhau (cùng thay đúng 1 từ).',
	'',
	'吗 (target=吗):',
	'  ❌ SAI: 你好吗[BLANK]？  (吗 đã có trong 好吗, lại thêm [BLANK])',
	'  ✓ ĐÚNG: 你好[BLANK]？|nǐ hǎo [BLANK]?|Bạn khỏe [BLANK]?',
	'',
	'什么 (target=什么):',
	'  ❌ SAI: 你叫什么[BLANK]？  (什么 đã có sẵn, [BLANK] đặt lệch)',
	'  ✓ ĐÚNG: 你叫[BLANK]？|nǐ jiào [BLANK]?|Bạn gọi là [BLANK]?',
	'',
	'人 (target=人):',
	'  ❌ SAI: 你认识那个人[BLANK]？  (人 đã có trong 那个人)',
	'  ✓ ĐÚNG: 你认识那个[BLANK]吗？|nǐ rènshi nàge [BLANK] ma?|Bạn quen [BLANK] kia không?',
	'',
	'Dòng 1 — header chính xác (phân tách bằng TAB):',
	AI_IMPORT_TSV_COLUMNS.join('\t'),
	'',
	'Mỗi dòng tiếp theo = 1 từ vựng. Cột bắt buộc: simplified, pinyin, meaning_vi, vi_du_1 … vi_du_5.',
	'Cột tùy chọn: han_viet, part_of_speech, ghi_chu.',
	'',
	'Mỗi ô vi_du_N: `câu Hán có [BLANK] | pinyin cả câu | câu nghĩa tiếng Việt có [BLANK]`',
	'Đúng 1 chỗ [BLANK] trong câu Hán, 1 chỗ [BLANK] trong pinyin, 1 chỗ [BLANK] trong câu nghĩa Việt.',
	'',
	'Ví dụ 1 dòng (các cột phân tách TAB, không hiển thị \\t trong output thật):',
	'老师\tlǎoshī\tgiáo viên\tlão sư\tdanh từ\t\t他在学校每天教学生，他是[BLANK]。|tā zài xuéxiào měitiān jiāo xuésheng, tā shì [BLANK].|Anh ấy dạy học sinh mỗi ngày, anh ấy là [BLANK].\t...',
	'',
	'Trước khi output, kiểm tra TỪNG ô vi_du_N:',
	'  [ ] Câu Hán có đúng 1 [BLANK] không?',
	'  [ ] Pinyin có [BLANK] ở đúng vị trí không?',
	'  [ ] Câu Việt có đúng 1 [BLANK] không?',
	'  [ ] Từ mục tiêu có xuất hiện NGOÀI [BLANK] không? (nếu có → SỬA: chỉ để 1 [BLANK])',
	'  [ ] Vị trí [BLANK] ở Hán / pinyin / Việt có trùng nhau không?',
	'  → Nếu bất kỳ ô nào KHÔNG có [BLANK] trong câu Hán → SỬA NGAY trước khi output.',
].join('\n');

const HEADER_ALIASES: Record<string, string> = {
	simplified: 'simplified',
	pinyin: 'pinyin',
	meaning_vi: 'meaning_vi',
	meaningvi: 'meaning_vi',
	han_viet: 'han_viet',
	hanviet: 'han_viet',
	part_of_speech: 'part_of_speech',
	partofspeech: 'part_of_speech',
	ghi_chu: 'ghi_chu',
	ghichu: 'ghi_chu',
	vi_du_1: 'vi_du_1',
	vi_du_2: 'vi_du_2',
	vi_du_3: 'vi_du_3',
	vi_du_4: 'vi_du_4',
	vi_du_5: 'vi_du_5',
	vidu1: 'vi_du_1',
	vidu2: 'vi_du_2',
	vidu3: 'vi_du_3',
	vidu4: 'vi_du_4',
	vidu5: 'vi_du_5',
};

function normalizeHeaderKey(raw: string): string {
	return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

function stripCodeFence(text: string): string {
	const trimmed = text.trim();
	const fenceMatch = trimmed.match(/^```(?:tsv|csv|text)?\s*\n?([\s\S]*?)\n?```$/i);
	return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function nonEmptyLines(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter((line) => line.trim().length > 0);
}

function looksLikeHeader(line: string): boolean {
	const lower = line.toLowerCase();
	return lower.includes('simplified') && (lower.includes('pinyin') || lower.includes('meaning'));
}

function mapHeaderColumns(headerCells: string[]): Map<number, string> {
	const mapping = new Map<number, string>();
	for (let i = 0; i < headerCells.length; i++) {
		const key = normalizeHeaderKey(headerCells[i] ?? '');
		const canonical = HEADER_ALIASES[key.replace(/-/g, '_')];
		if (canonical) mapping.set(i, canonical);
	}
	return mapping;
}

function rowFromCells(cells: string[], columnMap: Map<number, string> | null): Record<string, string> {
	const row: Record<string, string> = {};
	if (columnMap && columnMap.size > 0) {
		for (const [index, field] of columnMap) {
			row[field] = (cells[index] ?? '').trim();
		}
		return row;
	}
	for (let i = 0; i < AI_IMPORT_TSV_COLUMNS.length; i++) {
		const field = AI_IMPORT_TSV_COLUMNS[i];
		row[field] = (cells[i] ?? '').trim();
	}
	return row;
}

export interface BuildAiSmartImportPromptInput {
	setName: string;
	rawList: string;
}

export function buildAiSmartImportPrompt({ setName, rawList }: BuildAiSmartImportPromptInput): string {
	const trimmedSet = setName.trim();
	const trimmedList = rawList.trim();

	return [
		'# NHIỆM VỤ: Tạo dữ liệu từ vựng tiếng Trung cho app học tập',
		'',
		`Tên bộ từ (bo_tu): "${trimmedSet}" — app sẽ tự gán, KHÔNG cần cột bo_tu trong output.`,
		'',
		'## PHẦN 1 — HƯỚNG DẪN CHUNG',
		AI_IMPORT_GUIDE_TEXT,
		'',
		'## PHẦN 2 — DANH SÁCH TỪ THÔ (tối thiểu simplified + nghĩa tiếng Việt)',
		'Mỗi dòng = 1 từ. Thứ tự cột tự do — bạn tự nhận diện chữ Hán và nghĩa.',
		'Nếu thiếu pinyin/hán việt/loại từ, hãy bổ sung chính xác.',
		'',
		trimmedList || '(chưa có danh sách — hãy yêu cầu người dùng cung cấp)',
		'',
		'## PHẦN 3 — YÊU CẦU OUTPUT',
		AI_IMPORT_OUTPUT_SPEC,
	].join('\n');
}

export function parsePastedTuVung(text: string, setName: string): Record<string, string>[] {
	const trimmedSet = setName.trim();
	if (!trimmedSet) {
		throw new AppError('Tên bộ từ không được để trống', 400);
	}

	const cleaned = stripCodeFence(text);
	if (!cleaned.trim()) {
		throw new AppError('Chưa có dữ liệu để import — hãy dán output từ AI', 400);
	}

	const lines = nonEmptyLines(cleaned);
	if (!lines.length) {
		throw new AppError('Chưa có dữ liệu để import — hãy dán output từ AI', 400);
	}

	const hasTab = lines.some((line) => line.includes('\t'));
	if (!hasTab) {
		throw new AppError(
			'AI chưa xuất đúng định dạng TSV (thiếu ký tự TAB giữa các cột). Hãy copy lại prompt và yêu cầu AI chỉ trả TSV có header.',
			400,
		);
	}

	let dataLines = lines;
	let columnMap: Map<number, string> | null = null;

	if (looksLikeHeader(lines[0])) {
		const headerCells = lines[0].split('\t');
		columnMap = mapHeaderColumns(headerCells);
		if (columnMap.size === 0) {
			throw new AppError('Header TSV không hợp lệ — cần có cột simplified và pinyin/meaning_vi', 400);
		}
		dataLines = lines.slice(1);
	}

	if (!dataLines.length) {
		throw new AppError('Không có dòng dữ liệu sau header — hãy dán lại output từ AI', 400);
	}

	const rows: Record<string, string>[] = [];
	for (const line of dataLines) {
		if (!line.includes('\t')) continue;
		const cells = line.split('\t');
		const row = rowFromCells(cells, columnMap);
		const hasContent = Object.values(row).some((v) => v.length > 0);
		if (!hasContent) continue;
		row.bo_tu = trimmedSet;
		rows.push(row);
	}

	if (!rows.length) {
		throw new AppError(
			'Không parse được dòng nào — kiểm tra AI đã xuất TSV với TAB giữa các cột chưa.',
			400,
		);
	}

	return rows;
}
