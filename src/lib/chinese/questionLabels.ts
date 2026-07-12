import type { CnQuestionType, CnWordProgressState } from '@/types/chinese';
import type { SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import { resolvePracticeSessionMode } from '@/lib/chinese/practiceTaxonomy';

export function learnerQuestionLabel(type: CnQuestionType): string {
	const labels: Record<CnQuestionType, string> = {
		hanzi_to_meaning: 'Nhận biết nghĩa',
		meaning_to_hanzi: 'Nhớ chữ từ nghĩa',
		meaning_to_hanzi_typed: 'Gõ chữ từ nghĩa',
		sound_to_hanzi: 'Âm đọc → chọn chữ',
		sound_to_hanzi_typed: 'Âm đọc → gõ chữ',
		fill_sentence: 'Điền từ vào câu',
		fill_sentence_typed: 'Gõ từ vào câu',
	};
	return labels[type];
}

export function learnerSessionLabel(type: CnQuestionType): string {
	const channel: Record<CnQuestionType, SkillChannel> = {
		hanzi_to_meaning: 'meaning',
		meaning_to_hanzi: 'meaning',
		meaning_to_hanzi_typed: 'meaning',
		sound_to_hanzi: 'sound',
		sound_to_hanzi_typed: 'sound',
		fill_sentence: 'sentence',
		fill_sentence_typed: 'sentence',
	};
	return channelLabel(channel[type]);
}

export function questionTypeLabel(type: CnQuestionType): string {
	const labels: Record<CnQuestionType, string> = {
		hanzi_to_meaning: 'Hán tự → Nghĩa',
		meaning_to_hanzi: 'Nghĩa → Hán tự',
		meaning_to_hanzi_typed: 'Nghĩa → Gõ Hán tự',
		sound_to_hanzi: 'Âm đọc → Hán tự',
		sound_to_hanzi_typed: 'Âm đọc → Gõ Hán tự',
		fill_sentence: 'Câu → Chọn từ',
		fill_sentence_typed: 'Câu → Gõ từ',
	};
	return labels[type];
}

export function practiceModeLabel(mode: string): string {
	const labels: Record<string, string> = {
		smart_mixed: 'Tổng hợp',
		mixed: 'Tổng hợp',
		level_mcq1: 'Mới nhận ra',
		level_mcq2: 'Đang làm quen',
		level_recall: 'Bắt đầu nhớ',
		level_maintain: 'Thuần thục',
		meaning: 'Nghĩa',
		core_vocab: 'Nghĩa',
		core: 'Nghĩa',
		sound: 'Âm đọc',
		pronunciation: 'Âm đọc',
		listening: 'Âm đọc',
		pinyin: 'Âm đọc',
		sentence: 'Câu',
		mcq: 'Chỉ MCQ',
		mcqs: 'Chỉ MCQ',
		practice_mcq: 'Chỉ MCQ',
	};
	return labels[mode] ?? 'Luyện tập';
}

export const PRACTICE_MIX_MODE = {
	mode: 'smart_mixed',
	label: 'Tổng hợp',
	description: 'Xen 3 kênh · level SRS theo tiến độ từng từ',
	icon: 'shuffle',
} as const;

export const PRACTICE_MCQ_MODE = {
	mode: 'mcq',
	label: 'Chỉ MCQ',
	description: 'Chọn đáp án — xen 3 kênh, không gõ chữ',
	icon: 'quiz',
} as const;

/** Fixed SRS difficulty — rotates all 3 channels at the chosen level (does not change SRS data). */
export const PRACTICE_LEVEL_MODES = [
	{
		mode: 'level_mcq1',
		label: 'Mới nhận ra',
		description: 'MCQ nhận biết',
		icon: 'looks_one',
		intervalIdx: 0,
	},
	{
		mode: 'level_mcq2',
		label: 'Đang làm quen',
		description: 'MCQ nhớ chiều ngược',
		icon: 'looks_two',
		intervalIdx: 1,
	},
	{
		mode: 'level_recall',
		label: 'Bắt đầu nhớ',
		description: 'Gõ chữ / âm đọc / câu',
		icon: 'looks_3',
		intervalIdx: 2,
	},
	{
		mode: 'level_maintain',
		label: 'Thuần thục',
		description: 'Ôn sâu xen kênh',
		icon: 'military_tech',
		intervalIdx: 3,
	},
] as const;

export const PRACTICE_MODES = [PRACTICE_MIX_MODE, ...PRACTICE_LEVEL_MODES];

/** @deprecated Use PRACTICE_LEVEL_MODES — kept for imports */
export const PRACTICE_CHANNEL_MODES = PRACTICE_LEVEL_MODES;

export function practiceModeChannel(mode: string): SkillChannel | null {
	return resolvePracticeSessionMode(mode).targetChannel ?? null;
}

export function channelLabel(channel: string): string {
	const labels: Record<string, string> = {
		meaning: 'Nghĩa',
		sound: 'Âm đọc',
		sentence: 'Câu',
	};
	return labels[channel] ?? channel;
}

export function isSoundQuestion(type: CnQuestionType): boolean {
	return type.startsWith('sound_');
}

/** @deprecated Use isSoundQuestion */
export function isAudioQuestion(type: CnQuestionType): boolean {
	return isSoundQuestion(type);
}

export function isTypedQuestion(type: string): boolean {
	return type.endsWith('_typed');
}

export function isFillSentenceQuestion(type: CnQuestionType): boolean {
	return type === 'fill_sentence' || type === 'fill_sentence_typed';
}

/** Learner-facing SRS level name from channel interval index */
export function levelNameFromIntervalIdx(idx: number): string {
	if (idx <= 0) return 'Mới nhận ra';
	if (idx === 1) return 'Đang làm quen';
	if (idx === 2) return 'Bắt đầu nhớ';
	if (idx === 3) return 'Đang vào guồng';
	if (idx === 4) return 'Sắp thuần thục';
	return 'Thuần thục';
}

/** Motivational aggregate word state label */
export function wordLevelName(state: CnWordProgressState): string {
	const map: Record<CnWordProgressState, string> = {
		new: 'Chưa gặp',
		learning: 'Đang học',
		weak: 'Cần ôn lại',
		familiar: 'Bắt đầu nhớ',
		strong: 'Sắp thuần thục',
		mastered: 'Thuần thục',
	};
	return map[state];
}
