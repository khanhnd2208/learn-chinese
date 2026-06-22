import type { CnQuestionType } from '@/types/chinese';
import type { SkillChannel } from '@/lib/chinese/coreQuestionTypes';

export function learnerQuestionLabel(type: CnQuestionType): string {
	const labels: Record<CnQuestionType, string> = {
		hanzi_to_meaning: 'Nhận biết nghĩa',
		meaning_to_hanzi: 'Nhớ chữ từ nghĩa',
		meaning_to_hanzi_typed: 'Gõ chữ từ nghĩa',
		pinyin_to_hanzi: 'Nối pinyin với chữ',
		hanzi_to_pinyin: 'Chọn pinyin',
		hanzi_to_pinyin_typed: 'Gõ pinyin',
		audio_to_hanzi: 'Nghe → chọn chữ',
		audio_to_hanzi_typed: 'Nghe → gõ chữ',
		audio_to_meaning: 'Nghe → hiểu nghĩa',
	};
	return labels[type];
}

export function learnerSessionLabel(type: CnQuestionType): string {
	const channel: Record<CnQuestionType, SkillChannel> = {
		hanzi_to_meaning: 'meaning',
		meaning_to_hanzi: 'meaning',
		meaning_to_hanzi_typed: 'meaning',
		pinyin_to_hanzi: 'pinyin',
		hanzi_to_pinyin: 'pinyin',
		hanzi_to_pinyin_typed: 'pinyin',
		audio_to_hanzi: 'listening',
		audio_to_hanzi_typed: 'listening',
		audio_to_meaning: 'listening',
	};
	return channelLabel(channel[type]);
}

export function questionTypeLabel(type: CnQuestionType): string {
	const labels: Record<CnQuestionType, string> = {
		hanzi_to_meaning: 'Hán tự → Nghĩa',
		meaning_to_hanzi: 'Nghĩa → Hán tự',
		meaning_to_hanzi_typed: 'Nghĩa → Gõ Hán tự',
		pinyin_to_hanzi: 'Pinyin → Hán tự',
		hanzi_to_pinyin: 'Hán tự → Pinyin',
		hanzi_to_pinyin_typed: 'Hán tự → Gõ pinyin',
		audio_to_hanzi: 'Nghe → Hán tự',
		audio_to_hanzi_typed: 'Nghe → Gõ Hán tự',
		audio_to_meaning: 'Nghe → Nghĩa',
	};
	return labels[type];
}

export function practiceModeLabel(mode: string): string {
	const labels: Record<string, string> = {
		core_vocab: 'Nhớ nghĩa',
		core: 'Nhớ nghĩa',
		listening: 'Nghe nhận ra',
		smart_mixed: 'Ôn nhanh',
		mixed: 'Ôn nhanh',
	};
	return labels[mode] ?? 'Luyện tập';
}

export const PRACTICE_MODES = [
	{ mode: 'core_vocab', label: 'Học từ mới', icon: 'menu_book' },
	{ mode: 'listening', label: 'Luyện nghe', icon: 'hearing' },
	{ mode: 'smart_mixed', label: 'Ôn nhanh', icon: 'shuffle' },
] as const;

export function channelLabel(channel: string): string {
	const labels: Record<string, string> = {
		meaning: 'Nghĩa',
		listening: 'Nghe',
		pinyin: 'Pinyin',
	};
	return labels[channel] ?? channel;
}

export function isAudioQuestion(type: CnQuestionType): boolean {
	return type.startsWith('audio_');
}

export function isTypedQuestion(type: CnQuestionType): boolean {
	return type.endsWith('_typed');
}
