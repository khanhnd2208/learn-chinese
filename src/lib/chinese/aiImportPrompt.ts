/* ════════════════════════════════════════════════════════════════════════
   aiImportPrompt.ts — AI Smart Import prompt builder & TSV paste parser
   ════════════════════════════════════════════════════════════════════════ */
import { AppError } from '@/lib/appError';
import { MAX_FILL_SENTENCE_HAN_LENGTH } from '@/lib/chinese/fillExampleValidator';
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

/** TSV columns when importing multiple sets (bo_tu required per row). */
export const AI_IMPORT_TSV_COLUMNS_MULTI = ['bo_tu', ...AI_IMPORT_TSV_COLUMNS] as const;

const VI_DU_COLUMNS_LABEL = 'vi_du_1, vi_du_2, vi_du_3, vi_du_4, vi_du_5 (đủ cả 5)';

/** Five distinct fill-example cells for sample TSV row (老师). */
const SAMPLE_VI_DU_CELLS = [
	'他在学校每天教学生，他是[BLANK]。|tā zài xuéxiào měitiān jiāo xuésheng, tā shì [BLANK].|Anh ấy dạy học sinh mỗi ngày, anh ấy là [BLANK].',
	'同学们都叫他[BLANK]。|tóngxuémen dōu jiào tā [BLANK].|Các bạn học sinh đều gọi anh ấy là [BLANK].',
	'我的爸爸是一名[BLANK]。|wǒ de bàba shì yī míng [BLANK].|Bố tôi là một [BLANK].',
	'她以后想当一名[BLANK]。|tā yǐhòu xiǎng dāng yī míng [BLANK].|Sau này cô ấy muốn làm [BLANK].',
	'这位[BLANK]很有耐心。|zhè wèi [BLANK] hěn yǒu nàixīn.|Vị [BLANK] này rất kiên nhẫn.',
] as const;

function buildHardConstraintsBlock(columns: readonly string[]): string[] {
	const lines = [
		'🚨 RÀNG BUỘC CỨNG (app sẽ TỪ CHỐI nếu sai):',
		`- Mỗi từ PHẢI có ĐỦ 5 ô ${VI_DU_COLUMNS_LABEL} — thiếu 1 ô hoặc ô trống → CẢ DÒNG bị loại.`,
		'- Mỗi ô vi_du = đúng 3 phần ngăn bằng dấu | (câu Hán | pinyin | câu Việt).',
		`- Câu Hán: đúng 1 [BLANK], tối đa ${MAX_FILL_SENTENCE_HAN_LENGTH} chữ Hán.`,
		'- Câu Việt: đúng 1 [BLANK] tại vị trí nghĩa của từ.',
		'- Từ mục tiêu (simplified) xuất hiện ĐÚNG 1 lần trong câu Hán — tại [BLANK], không ở chỗ khác.',
		'- simplified, pinyin, meaning_vi là bắt buộc; không trùng simplified trong cùng file.',
	];
	if (columns.includes('bo_tu')) {
		lines.push('- Mỗi dòng PHẢI có cột bo_tu khớp nhãn bộ ở PHẦN 2.');
	}
	lines.push('');
	return lines;
}

function buildSampleTsvDataRow(columns: readonly string[]): string {
	const base = [
		'老师',
		'lǎoshī',
		'giáo viên',
		'lão sư',
		'danh từ',
		'',
		...SAMPLE_VI_DU_CELLS,
	];
	if (columns.includes('bo_tu')) {
		return ['HSK1 Bài 3', ...base].join('\t');
	}
	return base.join('\t');
}

function buildAiImportOutputSpec(
	columns: readonly string[],
	preamble: string[],
): string {
	const requiredColumns = columns.includes('bo_tu')
		? `bo_tu, simplified, pinyin, meaning_vi, ${VI_DU_COLUMNS_LABEL}`
		: `simplified, pinyin, meaning_vi, ${VI_DU_COLUMNS_LABEL}`;

	return [
		'## ĐỊNH DẠNG OUTPUT (BẮT BUỘC)',
		'',
		...preamble,
		...buildHardConstraintsBlock(columns),
		'📊 QUY TẮC ĐẾM CÂU VÍ DỤ (chống thiếu câu — lỗi hay gặp nhất):',
		`- Mỗi từ PHẢI điền ĐỦ cả 5 cột ${VI_DU_COLUMNS_LABEL} — 5 câu KHÁC NHAU.`,
		'- TUYỆT ĐỐI KHÔNG dùng `...`, `v.v`, `(tương tự)` hay để trống bất kỳ ô vi_du nào.',
		'- KHÔNG gộp nhiều câu vào 1 ô. Mỗi ô = đúng 1 câu.',
		'- KHÔNG chỉ điền vi_du_1, vi_du_2 rồi bỏ vi_du_3, vi_du_4, vi_du_5.',
		'',
		'📐 QUY TẮC SỐ CỘT TSV (chống lệch cột):',
		`- Mỗi dòng dữ liệu phải có ĐÚNG ${columns.length - 1} ký tự TAB (= ${columns.length} cột như header).`,
		'- Ô trống (han_viet, ghi_chu) vẫn PHẢI giữ TAB — không được bỏ cột.',
		'- Phân tách cột chỉ bằng TAB; bên trong ô vi_du dùng dấu | (không dùng TAB trong ô).',
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
		columns.join('\t'),
		'',
		`Mỗi dòng tiếp theo = 1 từ vựng. Cột bắt buộc: ${requiredColumns}.`,
		columns.includes('bo_tu')
			? 'Cột tùy chọn: han_viet, part_of_speech, ghi_chu. Mỗi dòng phải có bo_tu khớp nhãn bộ ở PHẦN 2.'
			: 'Cột tùy chọn: han_viet, part_of_speech, ghi_chu.',
		'',
		'Mỗi ô vi_du_N: `câu Hán có [BLANK] | pinyin cả câu | câu nghĩa tiếng Việt có [BLANK]`',
		'Đúng 1 chỗ [BLANK] trong câu Hán, 1 chỗ [BLANK] trong pinyin, 1 chỗ [BLANK] trong câu nghĩa Việt.',
		'',
		'Ví dụ 1 dòng ĐẦY ĐỦ (các cột phân tách TAB — phải có đủ 5 ô vi_du, không được cắt ngắn):',
		buildSampleTsvDataRow(columns),
		'',
		'Trước khi output, kiểm tra TỪNG ô vi_du_N:',
		'  [ ] Câu Hán có đúng 1 [BLANK] không?',
		'  [ ] Pinyin có [BLANK] ở đúng vị trí không?',
		'  [ ] Câu Việt có đúng 1 [BLANK] không?',
		'  [ ] Từ mục tiêu có xuất hiện NGOÀI [BLANK] không? (nếu có → SỬA: chỉ để 1 [BLANK])',
		'  [ ] Vị trí [BLANK] ở Hán / pinyin / Việt có trùng nhau không?',
		'  → Nếu bất kỳ ô nào KHÔNG có [BLANK] trong câu Hán → SỬA NGAY trước khi output.',
		'',
		'Checklist cuối (bắt buộc trước khi trả TSV):',
		'  [ ] Mỗi từ có ĐỦ 5 ô vi_du_1…vi_du_5 khác nhau, không ô nào trống hay chứa `...`?',
		`  [ ] Mỗi dòng có đúng ${columns.length} cột (= số TAB như header)?`,
		'  [ ] Không trùng simplified trong file?',
	].join('\n');
}

export const AI_IMPORT_OUTPUT_SPEC = buildAiImportOutputSpec(AI_IMPORT_TSV_COLUMNS, []);

export const AI_IMPORT_OUTPUT_SPEC_MULTI = buildAiImportOutputSpec(AI_IMPORT_TSV_COLUMNS_MULTI, [
	'Import NHIỀU bộ từ — mỗi dòng PHẢI có cột bo_tu (tên bộ từ).',
	'Giá trị bo_tu phải khớp chính xác với nhãn [Tên bộ từ] trong PHẦN 2.',
	'',
]);

const HEADER_ALIASES: Record<string, string> = {
	bo_tu: 'bo_tu',
	botu: 'bo_tu',
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
	rawList: string;
}

export interface BuildAiSmartImportPromptMultiInput {
	rawList: string;
}

export function buildAiSmartImportPrompt({ rawList }: BuildAiSmartImportPromptInput): string {
	const trimmedList = rawList.trim();

	return [
		'# NHIỆM VỤ: Tạo dữ liệu từ vựng tiếng Trung cho app học tập',
		'',
		'App sẽ tự gán tên bộ từ khi import — KHÔNG cần cột bo_tu trong output.',
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

export function buildAiSmartImportPromptMulti({ rawList }: BuildAiSmartImportPromptMultiInput): string {
	const trimmedList = rawList.trim();

	return [
		'# NHIỆM VỤ: Tạo dữ liệu từ vựng tiếng Trung cho app học tập (NHIỀU BỘ TỪ)',
		'',
		'Import này gồm NHIỀU bộ từ. Mỗi dòng output PHẢI có cột bo_tu (tên bộ từ).',
		'',
		'## PHẦN 1 — HƯỚNG DẪN CHUNG',
		AI_IMPORT_GUIDE_TEXT,
		'',
		'## PHẦN 2 — DANH SÁCH TỪ THÔ (theo từng bộ từ)',
		'Dùng dòng `[Tên bộ từ]` làm tiêu đề mỗi bộ. Các dòng sau thuộc bộ đó cho đến khi gặp `[Tên bộ khác]`.',
		'Mỗi dòng từ = 1 từ, tối thiểu simplified + nghĩa tiếng Việt. Thứ tự cột tự do.',
		'Nếu thiếu pinyin/hán việt/loại từ, hãy bổ sung chính xác.',
		'',
		trimmedList || '(chưa có danh sách — hãy yêu cầu người dùng cung cấp)',
		'',
		'## PHẦN 3 — YÊU CẦU OUTPUT',
		AI_IMPORT_OUTPUT_SPEC_MULTI,
	].join('\n');
}

function resolveRowBoTu(row: Record<string, string>, fallbackSetName: string): string {
	const fromRow = (row.bo_tu ?? '').trim();
	if (fromRow) return fromRow;
	return fallbackSetName;
}

export function parsePastedTuVung(text: string, setName?: string): Record<string, string>[] {
	const trimmedSet = setName?.trim() ?? '';

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

	const hasBoTuColumn = columnMap ? [...columnMap.values()].includes('bo_tu') : false;

	const rows: Record<string, string>[] = [];
	for (const line of dataLines) {
		if (!line.includes('\t')) continue;
		const cells = line.split('\t');
		const row = rowFromCells(cells, columnMap);
		const hasContent = Object.values(row).some((v) => v.length > 0);
		if (!hasContent) continue;

		const resolvedBoTu = resolveRowBoTu(row, trimmedSet);
		if (!resolvedBoTu) {
			throw new AppError(
				hasBoTuColumn
					? 'Một hoặc nhiều dòng thiếu tên bộ từ (bo_tu) — điền đầy đủ hoặc chọn chế độ một bộ từ'
					: 'Tên bộ từ không được để trống — nhập tên bộ hoặc dùng TSV có cột bo_tu',
				400,
			);
		}
		row.bo_tu = resolvedBoTu;
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
