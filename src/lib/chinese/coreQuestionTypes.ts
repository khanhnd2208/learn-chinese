/* ════════════════════════════════════════════════════════════════════════
   coreQuestionTypes.ts — MVP practice/SRS question types (6 core only)
   ════════════════════════════════════════════════════════════════════════ */

export const CORE_QUESTION_TYPES = [
	'hanzi_to_meaning',
	'meaning_to_hanzi',
	'pinyin_to_hanzi',
	'audio_to_meaning',
	'audio_to_hanzi',
	'fill_sentence',
] as const;

export type CoreQuestionType = (typeof CORE_QUESTION_TYPES)[number];

export const CORE_QUESTION_TYPE_SET = new Set<string>(CORE_QUESTION_TYPES);

export type SkillChannel = 'meaning' | 'listening' | 'pinyin' | 'sentence';

export const ALL_SKILL_CHANNELS: SkillChannel[] = [
	'meaning', 'listening', 'pinyin', 'sentence',
];

export function questionChannel(type: CoreQuestionType): SkillChannel {
	switch (type) {
		case 'hanzi_to_meaning':
		case 'meaning_to_hanzi':
			return 'meaning';
		case 'pinyin_to_hanzi':
			return 'pinyin';
		case 'audio_to_meaning':
		case 'audio_to_hanzi':
			return 'listening';
		case 'fill_sentence':
			return 'sentence';
	}
}

export function isCoreQuestionType(value: string): value is CoreQuestionType {
	return CORE_QUESTION_TYPE_SET.has(value);
}
