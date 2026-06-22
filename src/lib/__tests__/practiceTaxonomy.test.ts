import { describe, it, expect } from 'vitest';
import { CORE_QUESTION_TYPES } from '@/lib/chinese/coreQuestionTypes';
import {
	ALL_SKILL_CHANNELS,
	CHANNEL_TO_GROUP,
	DEFAULT_GOAL_WEIGHTS,
	GROUP_QUESTION_MAP,
	getUnlockedGroups,
	isChannelUnlocked,
	practiceModeToGroup,
	reviewQuestionTypeForChannel,
	selectQuestionTypesForWord,
	wordSupportsQuestionType,
} from '@/lib/chinese/practiceTaxonomy';
import type { CnWordCardDTO } from '@/types/chinese';

function mkWord(overrides: Partial<CnWordCardDTO> = {}): CnWordCardDTO {
	return {
		id: 'w1',
		simplified: '学习',
		pinyin: 'xuéxí',
		hanViet: 'học tập',
		meaningVi: 'học tập',
		partOfSpeech: 'v',
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published',
		examples: [],
		patterns: [],
		chars: [],
		relatedWords: [],
		...overrides,
	};
}

describe('practiceTaxonomy (9 core types)', () => {
	it('has 3 SRS channels and 9 question types in groups', () => {
		expect(ALL_SKILL_CHANNELS).toEqual(['meaning', 'listening', 'pinyin']);
		const grouped = Object.values(GROUP_QUESTION_MAP).flat();
		expect(new Set(grouped).size).toBe(6);
		expect(CORE_QUESTION_TYPES.length).toBe(9);
	});

	it('maps channels to practice groups', () => {
		expect(CHANNEL_TO_GROUP.meaning).toBe('core_vocab');
		expect(CHANNEL_TO_GROUP.listening).toBe('listening');
		expect(CHANNEL_TO_GROUP.pinyin).toBe('core_vocab');
	});

	it('practice modes map to groups + smart_mixed', () => {
		expect(practiceModeToGroup('smart_mixed')).toBe('smart_mixed');
		expect(practiceModeToGroup('core_vocab')).toBe('core_vocab');
		expect(practiceModeToGroup('listening')).toBe('listening');
		expect(practiceModeToGroup('unknown')).toBe('smart_mixed');
	});

	it('all channels always unlocked', () => {
		expect(isChannelUnlocked(null, 'meaning')).toBe(true);
		expect(isChannelUnlocked(null, 'listening')).toBe(true);
		expect(isChannelUnlocked(null, 'pinyin')).toBe(true);
	});

	it('getUnlockedGroups returns core and listening', () => {
		expect(getUnlockedGroups(null)).toEqual(['core_vocab', 'listening']);
	});

	it('reviewQuestionTypeForChannel maps stage to question type', () => {
		expect(reviewQuestionTypeForChannel('meaning', 0)).toBe('hanzi_to_meaning');
		expect(reviewQuestionTypeForChannel('meaning', 1)).toBe('meaning_to_hanzi');
		expect(reviewQuestionTypeForChannel('meaning', 2)).toBe('meaning_to_hanzi_typed');
		expect(reviewQuestionTypeForChannel('pinyin', 1)).toBe('hanzi_to_pinyin');
		expect(reviewQuestionTypeForChannel('listening', 2)).toBe('audio_to_hanzi_typed');
	});

	it('typed types require word fields', () => {
		expect(wordSupportsQuestionType(mkWord(), 'meaning_to_hanzi_typed')).toBe(true);
		expect(wordSupportsQuestionType(mkWord({ pinyin: '' }), 'hanzi_to_pinyin_typed')).toBe(false);
	});

	it('selectQuestionTypesForWord returns only supported core types', () => {
		const word = mkWord();
		const types = selectQuestionTypesForWord(word, null, { group: 'smart_mixed', count: 6 });
		for (const t of types) {
			expect(CORE_QUESTION_TYPES).toContain(t);
			expect(wordSupportsQuestionType(word, t)).toBe(true);
		}
	});

	it('goal weights sum to 100', () => {
		const sum = DEFAULT_GOAL_WEIGHTS.meaning + DEFAULT_GOAL_WEIGHTS.listening
			+ DEFAULT_GOAL_WEIGHTS.pinyin;
		expect(sum).toBe(100);
	});
});
