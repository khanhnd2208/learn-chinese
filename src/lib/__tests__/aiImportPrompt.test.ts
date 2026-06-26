import { describe, it, expect } from 'vitest';
import { AppError } from '@/lib/appError';
import {
	AI_IMPORT_GUIDE_TEXT,
	AI_IMPORT_OUTPUT_SPEC,
	AI_IMPORT_OUTPUT_SPEC_MULTI,
	AI_IMPORT_TSV_COLUMNS,
	AI_IMPORT_TSV_COLUMNS_MULTI,
	buildAiSmartImportPrompt,
	buildAiSmartImportPromptMulti,
	parsePastedTuVung,
} from '@/lib/chinese/aiImportPrompt';

const EXAMPLE_CELL = '他是[BLANK]。|tā shì [BLANK].|Anh ấy là [BLANK].';
const LEGACY_EXAMPLE_CELL = '他是__。|tā shì __.|Anh ấy là __.';

function sampleTsvRow(simplified = '老师', pinyin = 'lǎoshī', meaning = 'giáo viên'): string {
	return [simplified, pinyin, meaning, 'lão sư', 'danh từ', '', ...Array(5).fill(EXAMPLE_CELL)].join('\t');
}

function sampleMultiTsvRow(
	boTu: string,
	simplified = '老师',
	pinyin = 'lǎoshī',
	meaning = 'giáo viên',
): string {
	return [boTu, ...sampleTsvRow(simplified, pinyin, meaning).split('\t')].join('\t');
}

describe('buildAiSmartImportPrompt', () => {
	it('includes guide, raw list, and output spec', () => {
		const prompt = buildAiSmartImportPrompt({
			rawList: '老师 | giáo viên',
		});
		expect(prompt).toContain(AI_IMPORT_GUIDE_TEXT);
		expect(prompt).toContain(AI_IMPORT_OUTPUT_SPEC);
		expect(prompt).toContain('老师 | giáo viên');
		expect(prompt).toContain('App sẽ tự gán tên bộ từ khi import');
		expect(prompt).toContain('PHẦN 1');
		expect(prompt).toContain('PHẦN 2');
		expect(prompt).toContain('PHẦN 3');
	});

	it('requires code fence and [BLANK] token in output spec', () => {
		const prompt = buildAiSmartImportPrompt({
			rawList: '好 | tốt',
		});
		expect(prompt).toContain('```tsv');
		expect(prompt).toContain('[BLANK]');
		expect(prompt).toContain('Copy code');
	});

	it('warns against duplicate target word and misaligned blanks', () => {
		const prompt = buildAiSmartImportPrompt({
			rawList: '吗 | không',
		});
		expect(prompt).toContain('LỖI HAY GẶP');
		expect(prompt).toContain('KHÔNG viết cả từ mục tiêu LẪN [BLANK]');
		expect(prompt).toContain('你好吗[BLANK]？');
		expect(prompt).toContain('Từ mục tiêu có xuất hiện NGOÀI [BLANK]');
		expect(prompt).toContain('Vị trí [BLANK] ở Hán / pinyin / Việt có trùng nhau');
	});

	it('enforces strict 5-example and TSV column rules in output spec', () => {
		expect(AI_IMPORT_OUTPUT_SPEC).toContain('RÀNG BUỘC CỨNG');
		expect(AI_IMPORT_OUTPUT_SPEC).toContain('QUY TẮC ĐẾM CÂU VÍ DỤ');
		expect(AI_IMPORT_OUTPUT_SPEC).toContain('QUY TẮC SỐ CỘT TSV');
		expect(AI_IMPORT_OUTPUT_SPEC).toContain('vi_du_1, vi_du_2, vi_du_3, vi_du_4, vi_du_5 (đủ cả 5)');
		expect(AI_IMPORT_OUTPUT_SPEC).toContain('TUYỆT ĐỐI KHÔNG dùng `...`');
		expect(AI_IMPORT_OUTPUT_SPEC).toContain('Checklist cuối');
		expect(AI_IMPORT_OUTPUT_SPEC).toContain('同学们都叫他[BLANK]');
		expect(AI_IMPORT_OUTPUT_SPEC).not.toMatch(/\t\.\.\.['"]?\s*$/m);
		expect(AI_IMPORT_OUTPUT_SPEC).not.toContain('vi_du_1 … vi_du_5');
	});
});

describe('buildAiSmartImportPromptMulti', () => {
	it('includes multi-set guide, raw list, and output spec with bo_tu', () => {
		const prompt = buildAiSmartImportPromptMulti({
			rawList: '[HSK1 Bài 3]\n老师 | giáo viên',
		});
		expect(prompt).toContain(AI_IMPORT_GUIDE_TEXT);
		expect(prompt).toContain(AI_IMPORT_OUTPUT_SPEC_MULTI);
		expect(prompt).toContain('NHIỀU BỘ TỪ');
		expect(prompt).toContain('[Tên bộ từ]');
		expect(prompt).toContain('[HSK1 Bài 3]');
		expect(prompt).toContain(AI_IMPORT_TSV_COLUMNS_MULTI.join('\t'));
		expect(AI_IMPORT_OUTPUT_SPEC_MULTI).toContain('RÀNG BUỘC CỨNG');
		expect(AI_IMPORT_OUTPUT_SPEC_MULTI).toContain('Mỗi dòng PHẢI có cột bo_tu');
	});
});

describe('parsePastedTuVung', () => {
	it('parses TSV with header and assigns setName when no bo_tu column', () => {
		const header = AI_IMPORT_TSV_COLUMNS.join('\t');
		const text = `${header}\n${sampleTsvRow()}`;
		const rows = parsePastedTuVung(text, 'Bộ test');
		expect(rows).toHaveLength(1);
		expect(rows[0].bo_tu).toBe('Bộ test');
		expect(rows[0].simplified).toBe('老师');
		expect(rows[0].pinyin).toBe('lǎoshī');
		expect(rows[0].meaning_vi).toBe('giáo viên');
		expect(rows[0].vi_du_1).toBe(EXAMPLE_CELL);
	});

	it('parses TSV with bo_tu column without overriding setName fallback', () => {
		const header = AI_IMPORT_TSV_COLUMNS_MULTI.join('\t');
		const text = `${header}\n${sampleMultiTsvRow('HSK1 Bài 3')}\n${sampleMultiTsvRow('HSK1 Bài 4', '谢谢', 'xièxie', 'cảm ơn')}`;
		const rows = parsePastedTuVung(text);
		expect(rows).toHaveLength(2);
		expect(rows[0].bo_tu).toBe('HSK1 Bài 3');
		expect(rows[1].bo_tu).toBe('HSK1 Bài 4');
		expect(rows[1].simplified).toBe('谢谢');
	});

	it('prefers bo_tu from TSV over setName when both provided', () => {
		const header = AI_IMPORT_TSV_COLUMNS_MULTI.join('\t');
		const text = `${header}\n${sampleMultiTsvRow('HSK1 Bài 3')}`;
		const rows = parsePastedTuVung(text, 'Bộ khác');
		expect(rows[0].bo_tu).toBe('HSK1 Bài 3');
	});

	it('throws when bo_tu missing and setName not provided', () => {
		const header = AI_IMPORT_TSV_COLUMNS.join('\t');
		expect(() => parsePastedTuVung(`${header}\n${sampleTsvRow()}`)).toThrow(/Tên bộ từ/);
	});

	it('throws when bo_tu column present but row value empty', () => {
		const header = AI_IMPORT_TSV_COLUMNS_MULTI.join('\t');
		const row = ['', ...sampleTsvRow().split('\t')].join('\t');
		expect(() => parsePastedTuVung(`${header}\n${row}`)).toThrow(/bo_tu/);
	});

	it('parses legacy __ cells from pasted TSV', () => {
		const header = AI_IMPORT_TSV_COLUMNS.join('\t');
		const row = [ '老师', 'lǎoshī', 'giáo viên', 'lão sư', 'danh từ', '', ...Array(5).fill(LEGACY_EXAMPLE_CELL) ].join('\t');
		const rows = parsePastedTuVung(`${header}\n${row}`, 'Bộ test');
		expect(rows[0].vi_du_1).toBe(LEGACY_EXAMPLE_CELL);
	});

	it('parses TSV without header using default column order', () => {
		const text = sampleTsvRow('你好', 'nǐ hǎo', 'xin chào');
		const rows = parsePastedTuVung(text, 'Bài 2');
		expect(rows).toHaveLength(1);
		expect(rows[0].bo_tu).toBe('Bài 2');
		expect(rows[0].simplified).toBe('你好');
		expect(rows[0].meaning_vi).toBe('xin chào');
	});

	it('strips markdown code fence', () => {
		const header = AI_IMPORT_TSV_COLUMNS.join('\t');
		const text = `\`\`\`tsv\n${header}\n${sampleTsvRow()}\n\`\`\``;
		const rows = parsePastedTuVung(text, 'Bộ fenced');
		expect(rows).toHaveLength(1);
		expect(rows[0].bo_tu).toBe('Bộ fenced');
	});

	it('throws when no TAB delimiter', () => {
		expect(() => parsePastedTuVung('simplified,pinyin,meaning', 'Bộ')).toThrow(AppError);
		expect(() => parsePastedTuVung('simplified,pinyin,meaning', 'Bộ')).toThrow(/TSV/);
	});

	it('throws when set name is empty', () => {
		const header = AI_IMPORT_TSV_COLUMNS.join('\t');
		expect(() => parsePastedTuVung(`${header}\n${sampleTsvRow()}`, '  ')).toThrow(/Tên bộ từ/);
	});

	it('throws when pasted text is empty', () => {
		expect(() => parsePastedTuVung('', 'Bộ')).toThrow(/Chưa có dữ liệu/);
	});
});
