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
	reviewQuestionTypeForMaintain,
	selectQuestionTypesForWord,
	wordSupportsQuestionType,
} from '@/lib/chinese/practiceTaxonomy';
import type { CnWordCardDTO, CnWordProgressDTO } from '@/types/chinese';

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

function mkProgress(overrides: Partial<CnWordProgressDTO> = {}): CnWordProgressDTO {
	return {
		wordId: 'w1',
		state: 'familiar',
		dueAt: new Date().toISOString(),
		intervalIdx: 2,
		lastReviewedAt: null,
		meaningRate: 80,
		listeningRate: 70,
		pinyinRate: 60,
		sentenceRate: 0,
		meaningTotal: 5,
		listeningTotal: 4,
		pinyinTotal: 3,
		sentenceTotal: 0,
		meaningIntervalIdx: 0,
		listeningIntervalIdx: 0,
		pinyinIntervalIdx: 0,
		sentenceIntervalIdx: 0,
		...overrides,
	};
}

describe('practiceTaxonomy (11 core types, 4 channels)', () => {
	it('has 4 SRS channels and 11 question types in groups', () => {
		expect(ALL_SKILL_CHANNELS).toEqual(['meaning', 'listening', 'pinyin', 'sentence']);
		const grouped = Object.values(GROUP_QUESTION_MAP).flat();
		expect(new Set(grouped).size).toBe(6);
		expect(CORE_QUESTION_TYPES.length).toBe(11);
	});

	it('maps channels to practice groups', () => {
		expect(CHANNEL_TO_GROUP.meaning).toBe('core_vocab');
		expect(CHANNEL_TO_GROUP.listening).toBe('listening');
		expect(CHANNEL_TO_GROUP.pinyin).toBe('core_vocab');
		expect(CHANNEL_TO_GROUP.sentence).toBe('sentence');
	});

	it('practice modes map to groups + smart_mixed', () => {
		expect(practiceModeToGroup('smart_mixed')).toBe('smart_mixed');
		expect(practiceModeToGroup('core_vocab')).toBe('core_vocab');
		expect(practiceModeToGroup('listening')).toBe('listening');
		expect(practiceModeToGroup('sentence')).toBe('sentence');
		expect(practiceModeToGroup('unknown')).toBe('smart_mixed');
	});

	it('all channels always unlocked', () => {
		expect(isChannelUnlocked(null, 'meaning')).toBe(true);
		expect(isChannelUnlocked(null, 'listening')).toBe(true);
		expect(isChannelUnlocked(null, 'pinyin')).toBe(true);
		expect(isChannelUnlocked(null, 'sentence')).toBe(true);
	});

	it('getUnlockedGroups returns core, listening, and sentence', () => {
		expect(getUnlockedGroups(null)).toEqual(['core_vocab', 'listening', 'sentence']);
	});

	it('reviewQuestionTypeForChannel maps stage to question type', () => {
		expect(reviewQuestionTypeForChannel('meaning', 0)).toBe('hanzi_to_meaning');
		expect(reviewQuestionTypeForChannel('meaning', 1)).toBe('meaning_to_hanzi');
		expect(reviewQuestionTypeForChannel('meaning', 2)).toBe('meaning_to_hanzi_typed');
		expect(reviewQuestionTypeForChannel('pinyin', 1)).toBe('hanzi_to_pinyin');
		expect(reviewQuestionTypeForChannel('listening', 0)).toBe('audio_to_hanzi');
		expect(reviewQuestionTypeForChannel('listening', 1)).toBe('audio_to_hanzi');
		expect(reviewQuestionTypeForChannel('listening', 2)).toBe('audio_to_hanzi_typed');
		expect(reviewQuestionTypeForChannel('sentence', 0)).toBe('fill_sentence');
		expect(reviewQuestionTypeForChannel('sentence', 2)).toBe('fill_sentence_typed');
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
			+ DEFAULT_GOAL_WEIGHTS.pinyin + DEFAULT_GOAL_WEIGHTS.sentence;
		expect(sum).toBe(100);
	});

	describe('stage-aware practice types', () => {
		it('uses MCQ2 type when meaningIntervalIdx is 1', () => {
			const word = mkWord();
			const progress = mkProgress({ meaningIntervalIdx: 1, pinyinIntervalIdx: 0, listeningIntervalIdx: 0 });
			const types = selectQuestionTypesForWord(word, progress, { group: 'core_vocab', count: 6 });
			expect(types).toContain('meaning_to_hanzi');
			expect(types).not.toContain('hanzi_to_meaning');
		});

		it('uses typed recall when meaningIntervalIdx is 2', () => {
			const word = mkWord();
			const progress = mkProgress({ meaningIntervalIdx: 2, pinyinIntervalIdx: 0, listeningIntervalIdx: 0 });
			const types = selectQuestionTypesForWord(word, progress, { group: 'core_vocab', count: 6 });
			expect(types).toContain('meaning_to_hanzi_typed');
			expect(types).not.toContain('hanzi_to_meaning');
			expect(types).not.toContain('meaning_to_hanzi');
		});

		it('assigns each channel its own stage-appropriate type in smart_mixed', () => {
			const word = mkWord();
			const progress = mkProgress({
				meaningIntervalIdx: 2,
				pinyinIntervalIdx: 1,
				listeningIntervalIdx: 0,
			});
			const types = selectQuestionTypesForWord(word, progress, { group: 'smart_mixed', count: 6 });
			expect(types).toContain('meaning_to_hanzi_typed');
			expect(types).toContain('hanzi_to_pinyin');
			expect(types).toContain('audio_to_hanzi');
			expect(types).not.toContain('audio_to_meaning');
			expect(types).toHaveLength(3);
		});

		it('falls back to MCQ pool when progress is null', () => {
			const word = mkWord();
			const types = selectQuestionTypesForWord(word, null, { group: 'core_vocab', count: 6 });
			const mcqOnly = GROUP_QUESTION_MAP.core_vocab;
			for (const t of types) {
				expect(mcqOnly).toContain(t);
			}
		});

		it('uses typed listening when listeningIntervalIdx is 2', () => {
			const word = mkWord();
			const progress = mkProgress({ listeningIntervalIdx: 2 });
			const types = selectQuestionTypesForWord(word, progress, { group: 'listening', count: 3 });
			expect(types).toEqual(['audio_to_hanzi_typed']);
		});
	});

	describe('reviewQuestionTypeForMaintain', () => {
		it('returns MCQ types when roll < 0.3', () => {
			expect(reviewQuestionTypeForMaintain('meaning', () => 0)).toBe('hanzi_to_meaning');
			expect(reviewQuestionTypeForMaintain('listening', () => 0)).toBe('audio_to_hanzi');
			expect(reviewQuestionTypeForMaintain('sentence', () => 0)).toBe('fill_sentence');
		});

		it('returns typed types when roll >= 0.3', () => {
			expect(reviewQuestionTypeForMaintain('meaning', () => 0.5)).toBe('meaning_to_hanzi_typed');
			expect(reviewQuestionTypeForMaintain('listening', () => 0.5)).toBe('audio_to_hanzi_typed');
			expect(reviewQuestionTypeForMaintain('pinyin', () => 0.5)).toBe('hanzi_to_pinyin_typed');
			expect(reviewQuestionTypeForMaintain('sentence', () => 0.5)).toBe('fill_sentence_typed');
		});

		it('uses mixed types at maintain stage', () => {
			expect(reviewQuestionTypeForChannel('meaning', 5, () => 0)).toBe('hanzi_to_meaning');
			expect(reviewQuestionTypeForChannel('meaning', 5, () => 0.5)).toBe('meaning_to_hanzi_typed');
		});
	});
});
