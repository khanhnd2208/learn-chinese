/* ════════════════════════════════════════════════════════════════════════
   coreQuestionTypes.ts — MVP practice/SRS question types (11 active)
   ════════════════════════════════════════════════════════════════════════ */

export const CORE_QUESTION_TYPES = [
	'hanzi_to_meaning',
	'meaning_to_hanzi',
	'pinyin_to_hanzi',
	'hanzi_to_pinyin',
	'audio_to_meaning',
	'audio_to_hanzi',
	'meaning_to_hanzi_typed',
	'hanzi_to_pinyin_typed',
	'audio_to_hanzi_typed',
	'fill_sentence',
	'fill_sentence_typed',
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
		case 'meaning_to_hanzi_typed':
			return 'meaning';
		case 'pinyin_to_hanzi':
		case 'hanzi_to_pinyin':
		case 'hanzi_to_pinyin_typed':
			return 'pinyin';
		case 'audio_to_meaning':
		case 'audio_to_hanzi':
		case 'audio_to_hanzi_typed':
			return 'listening';
		case 'fill_sentence':
		case 'fill_sentence_typed':
			return 'sentence';
	}
}

export function isTypedQuestionType(type: CoreQuestionType): boolean {
	return type.endsWith('_typed');
}

export function isCoreQuestionType(value: string): value is CoreQuestionType {
	return CORE_QUESTION_TYPE_SET.has(value);
}
