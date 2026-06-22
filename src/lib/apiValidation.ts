/* ════════════════════════════════════════════════════════════════════════
   apiValidation.ts — Shared API input validation
   ════════════════════════════════════════════════════════════════════════ */
import {
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
		return typeof row.wordId === 'string'
			&& row.wordId.length > 0
			&& typeof row.correct === 'boolean'
			&& typeof row.questionType === 'string'
			&& VALID_QUESTION_TYPES.has(row.questionType)
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

export { MAX_CN_TERMS_PER_SET, MAX_IMPORT_ROWS };
