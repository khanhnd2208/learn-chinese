/* ════════════════════════════════════════════════════════════════════════
   parseFillExample.ts — Parse tu_vung vi_du cells into CnExample fill data
   ════════════════════════════════════════════════════════════════════════ */
import { MAX_FILL_SENTENCE_HAN_LENGTH } from '@/lib/chinese/fillExampleValidator';

export const FILL_BLANK = '__';
export const MIN_FILL_EXAMPLES_PER_WORD = 5;
export const VI_DU_COLUMN_KEYS = ['vi_du_1', 'vi_du_2', 'vi_du_3', 'vi_du_4', 'vi_du_5'] as const;

export interface ParsedFillExample {
	hanzi: string;
	pinyin: string;
	meaningVi: string;
	meaningViTemplate: string;
	targetWordStart: number;
	targetWordEnd: number;
	naturalnessStatus: 'auto';
	/** True when the parser auto-inserted a blank (e.g. target word present but blank missing). */
	repaired?: boolean;
}

export type ParseFillExampleResult =
	| { ok: true; example: ParsedFillExample; warning?: string }
	| { ok: false; reason: string };

function hanCharCount(text: string): number {
	return [...text].filter((ch) => /\p{Script=Han}/u.test(ch)).length;
}

function countBlanks(text: string): number {
	const matches = text.match(/__/g);
	return matches ? matches.length : 0;
}

function targetAppearsOnlyAtBlank(hanzi: string, targetWord: string, start: number, end: number): boolean {
	let idx = hanzi.indexOf(targetWord);
	while (idx !== -1) {
		if (idx !== start) return false;
		idx = hanzi.indexOf(targetWord, idx + 1);
	}
	return hanzi.slice(start, end) === targetWord;
}

/** Normalize alternate blank tokens and strip markdown artifacts to internal `__`. */
export function normalizeFillBlankToken(text: string): string {
	return text
		.replace(/\*\*/g, '')
		.replace(/\[blank\]/gi, FILL_BLANK)
		.replace(/【】/g, FILL_BLANK)
		.replace(/_{3,}/g, FILL_BLANK);
}

function duplicateTargetReason(targetWord: string): string {
	return `từ mục tiêu "${targetWord}" đã xuất hiện sẵn trong câu — phải thay nó bằng [BLANK], không viết cả từ lẫn [BLANK]`;
}

function missingBlankReason(): string {
	return 'câu Hán mất dấu trống — có thể do Markdown nuốt __; copy lại output trong code block hoặc dùng [BLANK]';
}

/**
 * Normalize blank tokens; if Chinese part has no blank but still contains the target word,
 * replace the first occurrence with `__` (Pattern A auto-repair).
 */
export function prepareFillExampleParts(
	chinesePart: string,
	vnPart: string,
	targetWord: string,
): { chinese: string; vn: string; repaired: boolean } {
	let chinese = normalizeFillBlankToken(chinesePart);
	const vn = normalizeFillBlankToken(vnPart);
	let repaired = false;

	if (countBlanks(chinese) === 0 && targetWord && chinese.includes(targetWord)) {
		chinese = chinese.replace(targetWord, FILL_BLANK);
		repaired = true;
	}

	return { chinese, vn, repaired };
}

/** Parse one vi_du cell: `câu Hán có __ | pinyin | câu Việt có __` (also accepts [BLANK]) */
export function parseFillExampleCell(
	rawCell: string,
	targetWord: string,
	wordMeaningVi: string,
): ParseFillExampleResult {
	const trimmed = rawCell.trim();
	if (!trimmed) {
		return { ok: false, reason: 'ô trống' };
	}

	const parts = trimmed.split('|').map((s) => s.trim());
	if (parts.length < 3) {
		return { ok: false, reason: 'cần đúng 3 phần: câu Hán | pinyin | nghĩa Việt (phân tách bằng |)' };
	}

	const [rawChinese, rawPinyin, rawVn] = parts;
	const pinyin = normalizeFillBlankToken(rawPinyin);
	const { chinese: chinesePart, vn: vnPart, repaired } = prepareFillExampleParts(
		rawChinese,
		rawVn,
		targetWord,
	);

	if (countBlanks(chinesePart) !== 1) {
		if (countBlanks(chinesePart) === 0) {
			return { ok: false, reason: missingBlankReason() };
		}
		return { ok: false, reason: 'câu Hán phải có đúng một __' };
	}
	const vnBlanks = countBlanks(vnPart);
	if (vnBlanks > 1) {
		return { ok: false, reason: 'câu nghĩa Việt phải có đúng một __' };
	}
	if (!targetWord) {
		return { ok: false, reason: 'thiếu từ mục tiêu (simplified)' };
	}

	const blankIdx = chinesePart.indexOf(FILL_BLANK);
	const hanzi = chinesePart.replace(FILL_BLANK, targetWord);
	const targetWordStart = blankIdx;
	const targetWordEnd = blankIdx + targetWord.length;

	if (hanCharCount(hanzi) > MAX_FILL_SENTENCE_HAN_LENGTH) {
		return { ok: false, reason: `câu Hán quá dài (tối đa ${MAX_FILL_SENTENCE_HAN_LENGTH} chữ Hán)` };
	}
	if (!targetAppearsOnlyAtBlank(hanzi, targetWord, targetWordStart, targetWordEnd)) {
		return { ok: false, reason: duplicateTargetReason(targetWord) };
	}

	const primaryMeaning = wordMeaningVi.split(/[;；]/)[0]?.trim() || wordMeaningVi;
	const meaningVi = vnBlanks === 1 ? vnPart.replace(FILL_BLANK, primaryMeaning) : vnPart;
	const meaningViTemplate = vnBlanks === 1 ? vnPart : '';
	const warning = viWordCount(vnPart) < 4
		? 'câu tiếng Việt quá ngắn (dưới 4 từ) — nên dịch trọn câu'
		: undefined;

	return {
		ok: true,
		example: {
			hanzi,
			pinyin,
			meaningVi,
			meaningViTemplate,
			targetWordStart,
			targetWordEnd,
			naturalnessStatus: 'auto',
			...(repaired ? { repaired: true } : {}),
		},
		...(warning ? { warning } : {}),
	};
}

function viWordCount(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export function formatFillExampleCell(
	chineseWithBlank: string,
	pinyin: string,
	meaningVi: string,
	meaningViTemplate?: string | null,
): string {
	const vn = meaningViTemplate?.includes(FILL_BLANK) ? meaningViTemplate : meaningVi;
	return `${chineseWithBlank}|${pinyin}|${vn}`;
}
