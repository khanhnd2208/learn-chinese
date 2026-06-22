import type { CnQuestionType } from '@/types/chinese';
import type { SkillChannel } from '@/lib/chinese/coreQuestionTypes';

export function learnerQuestionLabel(type: CnQuestionType): string {
	const labels: Record<CnQuestionType, string> = {
		hanzi_to_meaning: 'Nhận biết nghĩa',
		meaning_to_hanzi: 'Nhớ chữ từ nghĩa',
		pinyin_to_hanzi: 'Nối pinyin với chữ',
		audio_to_hanzi: 'Nghe → chọn chữ',
		audio_to_meaning: 'Nghe → hiểu nghĩa',
		fill_sentence: 'Dùng từ trong câu',
	};
	return labels[type];
}

export function learnerSessionLabel(type: CnQuestionType): string {
	const channel: Record<CnQuestionType, SkillChannel> = {
		hanzi_to_meaning: 'meaning',
		meaning_to_hanzi: 'meaning',
		pinyin_to_hanzi: 'pinyin',
		audio_to_hanzi: 'listening',
		audio_to_meaning: 'listening',
		fill_sentence: 'sentence',
	};
	return channelLabel(channel[type]);
}

export function questionTypeLabel(type: CnQuestionType): string {
	const labels: Record<CnQuestionType, string> = {
		hanzi_to_meaning: 'Hán tự → Nghĩa',
		meaning_to_hanzi: 'Nghĩa → Hán tự',
		pinyin_to_hanzi: 'Pinyin → Hán tự',
		audio_to_hanzi: 'Nghe → Hán tự',
		audio_to_meaning: 'Nghe → Nghĩa',
		fill_sentence: 'Điền từ vào câu',
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
		smart_mixed: 'Ôn nhanh',
		mixed: 'Ôn nhanh',
	};
	return labels[mode] ?? 'Luyện tập';
}

export const PRACTICE_MODES = [
	{ mode: 'core_vocab', label: 'Học từ mới', icon: 'menu_book' },
	{ mode: 'listening', label: 'Luyện nghe', icon: 'hearing' },
	{ mode: 'sentence_usage', label: 'Luyện dùng câu', icon: 'edit_note' },
	{ mode: 'smart_mixed', label: 'Ôn nhanh', icon: 'shuffle' },
] as const;

export function channelLabel(channel: string): string {
	const labels: Record<string, string> = {
		meaning: 'Nghĩa',
		listening: 'Nghe',
		pinyin: 'Pinyin',
		sentence: 'Câu',
	};
	return labels[channel] ?? channel;
}

export function isAudioQuestion(type: CnQuestionType): boolean {
	return type.startsWith('audio_');
}
