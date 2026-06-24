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
}

export type ParseFillExampleResult =
	| { ok: true; example: ParsedFillExample }
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

/** Parse one vi_du cell: `câu Hán có __ | pinyin | câu Việt có __` */
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

	const [chinesePart, pinyin, vnPart] = parts;
	if (countBlanks(chinesePart) !== 1) {
		return { ok: false, reason: 'câu Hán phải có đúng một __' };
	}
	if (countBlanks(vnPart) !== 1) {
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
		return { ok: false, reason: 'từ mục tiêu chỉ được xuất hiện tại vị trí __' };
	}

	const meaningViTemplate = vnPart;
	const primaryMeaning = wordMeaningVi.split(/[;；]/)[0]?.trim() || wordMeaningVi;
	const meaningVi = vnPart.replace(FILL_BLANK, primaryMeaning);

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
		},
	};
}

export function formatFillExampleCell(
	chineseWithBlank: string,
	pinyin: string,
	vnWithBlank: string,
): string {
	return `${chineseWithBlank}|${pinyin}|${vnWithBlank}`;
}
