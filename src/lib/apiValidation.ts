/* ════════════════════════════════════════════════════════════════════════
   apiValidation.ts — Shared API input validation
   ════════════════════════════════════════════════════════════════════════ */
import {
	CN_MAX_BULK_ITEM_IDS,
	CN_MAX_EXCLUDE_IDS,
	CN_MAX_JSON_BODY_BYTES,
	CN_MAX_PRACTICE_COUNT,
	CN_MAX_SMART_IMPORT_TEXT_CHARS,
	CN_MAX_SUBMIT_ITEMS,
	MAX_CN_TERMS_PER_SET,
	MAX_IMPORT_FILE_BYTES,
	MAX_IMPORT_ROWS,
} from '@/config/constants';
import { CORE_QUESTION_TYPE_SET } from '@/lib/chinese/coreQuestionTypes';
import type { CnPracticeSubmitItem, CnErrorType } from '@/types/chinese';

const VALID_QUESTION_TYPES = CORE_QUESTION_TYPE_SET;

const VALID_ERROR_TYPES = new Set<CnErrorType>([
	'sai_nghia', 'sai_pinyin', 'sai_thanh_dieu', 'nghe_khong_ra',
	'nham_chu', 'quen_hanzi', 'sai_mau_cau', 'sai_vi_tri', 'qua_han',
]);

export function validatePracticeSubmitItems(items: unknown): items is CnPracticeSubmitItem[] {
	if (!Array.isArray(items) || items.length === 0 || items.length > CN_MAX_SUBMIT_ITEMS) {
		return false;
	}
	return items.every((item) => {
		if (!item || typeof item !== 'object') return false;
		const row = item as Record<string, unknown>;
		const hintOk = row.hintUsed === undefined || typeof row.hintUsed === 'boolean';
		const answerOk = row.answer === undefined || (typeof row.answer === 'string' && row.answer.length <= 200);
		const clientAnswerOk = row.clientAnswerId === undefined
			|| (typeof row.clientAnswerId === 'string' && row.clientAnswerId.length > 0 && row.clientAnswerId.length <= 80);
		const responseOk = row.responseMs === undefined
			|| (typeof row.responseMs === 'number'
				&& Number.isInteger(row.responseMs)
				&& row.responseMs >= 0
				&& row.responseMs <= 600_000);
		const attemptsOk = row.attempts === undefined
			|| (typeof row.attempts === 'number' && (row.attempts === 1 || row.attempts === 2));
		const disputedOk = row.disputed === undefined || typeof row.disputed === 'boolean';
		return typeof row.wordId === 'string'
			&& row.wordId.length > 0
			&& typeof row.correct === 'boolean'
			&& typeof row.questionType === 'string'
			&& VALID_QUESTION_TYPES.has(row.questionType)
			&& hintOk
			&& responseOk
			&& answerOk
			&& clientAnswerOk
			&& attemptsOk
			&& disputedOk
			&& (row.errorType === undefined
				|| row.errorType === null
				|| (typeof row.errorType === 'string' && VALID_ERROR_TYPES.has(row.errorType as CnErrorType)));
	});
}

export function validateSetTerms(terms: unknown): terms is string[] {
	if (!Array.isArray(terms) || terms.length === 0 || terms.length > MAX_CN_TERMS_PER_SET) {
		return false;
	}
	return terms.every((t) => typeof t === 'string' && t.trim().length > 0);
}

export function parseBoundedIntParam(
	value: string | null,
	options: { defaultValue: number; min: number; max: number },
): number | null {
	if (value === null || value.trim() === '') return options.defaultValue;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < options.min || parsed > options.max) {
		return null;
	}
	return parsed;
}

export function parseDelimitedListParam(
	value: string | null,
	options: { maxItems?: number; maxItemLength?: number } = {},
): string[] | null {
	const maxItems = options.maxItems ?? CN_MAX_EXCLUDE_IDS;
	const maxItemLength = options.maxItemLength ?? 120;
	if (!value) return [];
	const items = value
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);
	if (items.length > maxItems) return null;
	if (items.some((item) => item.length > maxItemLength)) return null;
	return items;
}

export function validateBulkItemIds(value: unknown): value is string[] {
	if (!Array.isArray(value) || value.length === 0 || value.length > CN_MAX_BULK_ITEM_IDS) {
		return false;
	}
	return value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 120);
}

export function validateSmartImportText(text: string): string | null {
	if (text.length > CN_MAX_SMART_IMPORT_TEXT_CHARS) {
		return `Dữ liệu quá dài (tối đa ${CN_MAX_SMART_IMPORT_TEXT_CHARS.toLocaleString('vi-VN')} ký tự)`;
	}
	return null;
}

export function validateJsonContentLength(headers: Headers): string | null {
	const raw = headers.get('content-length');
	if (!raw) return null;
	const size = Number(raw);
	if (Number.isFinite(size) && size > CN_MAX_JSON_BODY_BYTES) {
		return `JSON body quá lớn (tối đa ${Math.round(CN_MAX_JSON_BODY_BYTES / 1024)}KB)`;
	}
	return null;
}

export function validateImportFile(file: File): string | null {
	if (file.size > MAX_IMPORT_FILE_BYTES) {
		return `File quá lớn (tối đa ${MAX_IMPORT_FILE_BYTES / 1024 / 1024}MB)`;
	}
	const name = file.name.toLowerCase();
	if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
		return 'Chỉ hỗ trợ CSV hoặc XLSX';
	}
	return null;
}

export {
	CN_MAX_BULK_ITEM_IDS,
	CN_MAX_EXCLUDE_IDS,
	CN_MAX_PRACTICE_COUNT,
	CN_MAX_SMART_IMPORT_TEXT_CHARS,
	MAX_CN_TERMS_PER_SET,
	MAX_IMPORT_ROWS,
};
