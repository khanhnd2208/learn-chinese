import type { CnQuestionType } from '@/types/chinese';

export function questionTypeLabel(type: CnQuestionType): string {
	const labels: Record<CnQuestionType, string> = {
		hanzi_to_meaning: 'Hán tự → Nghĩa',
		meaning_to_hanzi: 'Nghĩa → Hán tự',
		pinyin_to_hanzi: 'Pinyin → Hán tự',
		audio_to_hanzi: 'Nghe → Hán tự',
		audio_to_meaning: 'Nghe → Nghĩa',
		audio_to_pinyin: 'Nghe → Pinyin',
		fill_sentence: 'Điền từ vào câu',
		sentence_order: 'Sắp xếp câu',
		radical_pick: 'Chọn bộ thủ',
		char_components: 'Thành phần chữ',
		similar_char: 'Phân biệt chữ',
		translate_sentence: 'Dịch câu',
	};
	return labels[type];
}

export function practiceModeLabel(mode: string): string {
	const labels: Record<string, string> = {
		core_vocab: 'Nhớ nghĩa',
		core: 'Nhớ nghĩa',
		listening: 'Nghe nhận ra',
		sentence_usage: 'Dùng trong câu',
		sentence: 'Dùng trong câu',
		hanzi_memory: 'Nhớ mặt chữ',
		hanzi: 'Nhớ mặt chữ',
		smart_mixed: 'Ôn tổng hợp',
		mixed: 'Ôn tổng hợp',
	};
	return labels[mode] ?? 'Luyện tập';
}

export const PRACTICE_MODES = [
	{ mode: 'core_vocab', label: 'Nhớ nghĩa', icon: 'menu_book' },
	{ mode: 'listening', label: 'Nghe nhận ra', icon: 'hearing' },
	{ mode: 'sentence_usage', label: 'Dùng trong câu', icon: 'edit_note' },
	{ mode: 'hanzi_memory', label: 'Nhớ mặt chữ', icon: 'biotech' },
	{ mode: 'smart_mixed', label: 'Ôn tổng hợp', icon: 'shuffle' },
] as const;

export function isAudioQuestion(type: CnQuestionType): boolean {
	return type.startsWith('audio_');
}
