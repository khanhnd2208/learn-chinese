/* ════════════════════════════════════════════════════════════════════════
   errorMapping.ts — Map question types to error categories
   ════════════════════════════════════════════════════════════════════════ */
import type { CnErrorType, CnQuestionType } from '@/types/chinese';

export type ErrorSeverity = 'light' | 'heavy';

const QUESTION_ERROR_MAP: Record<CnQuestionType, CnErrorType> = {
	hanzi_to_meaning: 'sai_nghia',
	meaning_to_hanzi: 'quen_hanzi',
	pinyin_to_hanzi: 'sai_pinyin',
	audio_to_hanzi: 'nghe_khong_ra',
	audio_to_meaning: 'nghe_khong_ra',
	fill_sentence: 'sai_mau_cau',
};

const HEAVY_ERROR_TYPES: ReadonlySet<CnErrorType> = new Set([
	'sai_nghia',
	'quen_hanzi',
	'nghe_khong_ra',
]);

export function inferErrorType(questionType: CnQuestionType): CnErrorType {
	return QUESTION_ERROR_MAP[questionType] ?? 'sai_nghia';
}

export function errorSeverity(errorType: CnErrorType): ErrorSeverity {
	return HEAVY_ERROR_TYPES.has(errorType) ? 'heavy' : 'light';
}

export function errorTypeLabel(errorType: CnErrorType): string {
	const labels: Record<CnErrorType, string> = {
		sai_nghia: 'Sai nghĩa',
		sai_pinyin: 'Sai pinyin',
		sai_thanh_dieu: 'Sai thanh điệu',
		nghe_khong_ra: 'Nghe không nhận ra',
		nham_chu: 'Nhầm chữ gần giống',
		quen_hanzi: 'Không nhớ Hán tự',
		sai_mau_cau: 'Sai mẫu câu',
		sai_vi_tri: 'Sai vị trí từ',
		qua_han: 'Quên do quá hạn ôn',
	};
	return labels[errorType];
}
