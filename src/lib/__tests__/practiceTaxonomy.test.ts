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
	resolvePracticeSessionMode,
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
		soundRate: 65,
		sentenceRate: 0,
		meaningTotal: 5,
		soundTotal: 7,
		sentenceTotal: 0,
		meaningIntervalIdx: 0,
		soundIntervalIdx: 0,
		sentenceIntervalIdx: 0,
		...overrides,
	};
}

describe('practiceTaxonomy (7 core types, 3 channels)', () => {
	it('has 3 SRS channels and 7 question types in groups', () => {
		expect(ALL_SKILL_CHANNELS).toEqual(['meaning', 'sound', 'sentence']);
		const grouped = Object.values(GROUP_QUESTION_MAP).flat();
		expect(new Set(grouped).size).toBe(4);
		expect(CORE_QUESTION_TYPES.length).toBe(7);
	});

	it('maps channels to practice groups', () => {
		expect(CHANNEL_TO_GROUP.meaning).toBe('core_vocab');
		expect(CHANNEL_TO_GROUP.sound).toBe('sound');
		expect(CHANNEL_TO_GROUP.sentence).toBe('sentence');
	});

	it('practice modes map to groups + smart_mixed', () => {
		expect(practiceModeToGroup('smart_mixed')).toBe('smart_mixed');
		expect(practiceModeToGroup('meaning')).toBe('core_vocab');
		expect(practiceModeToGroup('pinyin')).toBe('sound');
		expect(practiceModeToGroup('listening')).toBe('sound');
		expect(practiceModeToGroup('sound')).toBe('sound');
		expect(practiceModeToGroup('core_vocab')).toBe('core_vocab');
		expect(practiceModeToGroup('sentence')).toBe('sentence');
		expect(practiceModeToGroup('unknown')).toBe('smart_mixed');
	});

	it('resolvePracticeSessionMode maps channel modes', () => {
		expect(resolvePracticeSessionMode('meaning')).toEqual({ group: 'core_vocab', targetChannel: 'meaning' });
		expect(resolvePracticeSessionMode('pinyin')).toEqual({ group: 'sound', targetChannel: 'sound' });
		expect(resolvePracticeSessionMode('listening')).toEqual({ group: 'sound', targetChannel: 'sound' });
		expect(resolvePracticeSessionMode('smart_mixed')).toEqual({ group: 'smart_mixed', practiceFormat: 'mixed' });
	});

	it('resolvePracticeSessionMode maps fixed SRS level modes', () => {
		expect(resolvePracticeSessionMode('level_mcq1')).toEqual({ group: 'smart_mixed', fixedIntervalIdx: 0 });
		expect(resolvePracticeSessionMode('level_mcq2')).toEqual({ group: 'smart_mixed', fixedIntervalIdx: 1 });
		expect(resolvePracticeSessionMode('level_recall')).toEqual({ group: 'smart_mixed', fixedIntervalIdx: 2 });
		expect(resolvePracticeSessionMode('level_maintain')).toEqual({ group: 'smart_mixed', fixedIntervalIdx: 3 });
	});

	it('single-channel practice returns only that channel type', () => {
		const word = mkWord();
		const progress = mkProgress({ meaningIntervalIdx: 2, soundIntervalIdx: 0 });
		const types = selectQuestionTypesForWord(word, progress, {
			group: 'core_vocab',
			targetChannel: 'meaning',
			count: 3,
			sessionContext: 'practice',
		});
		expect(types).toEqual(['meaning_to_hanzi_typed']);
	});

	it('fixed level practice ignores progress interval', () => {
		const word = mkWord();
		const progress = mkProgress({ meaningIntervalIdx: 2, soundIntervalIdx: 2 });
		const types = selectQuestionTypesForWord(word, progress, {
			group: 'smart_mixed',
			targetChannel: 'meaning',
			count: 3,
			sessionContext: 'practice',
			fixedIntervalIdx: 0,
		});
		expect(types).toEqual(['hanzi_to_meaning']);
	});

	it('keeps every channel available when practice has no progress row', () => {
		expect(isChannelUnlocked(null, 'meaning')).toBe(true);
		expect(isChannelUnlocked(null, 'sound')).toBe(true);
		expect(isChannelUnlocked(null, 'sentence')).toBe(true);
		expect(getUnlockedGroups(null)).toEqual(['core_vocab', 'sound', 'sentence']);
	});

	it('unlocks practice groups from the meaning interval', () => {
		const early = mkProgress({ meaningIntervalIdx: 0, meaningTotal: 0, soundTotal: 0, sentenceTotal: 0 });
		expect(getUnlockedGroups(early)).toEqual(['core_vocab']);
		const sound = mkProgress({ meaningIntervalIdx: 1, meaningTotal: 1, soundTotal: 0, sentenceTotal: 0 });
		expect(getUnlockedGroups(sound)).toEqual(['core_vocab', 'sound']);
		const sentence = mkProgress({ meaningIntervalIdx: 2, meaningTotal: 2, soundTotal: 0, sentenceTotal: 0 });
		expect(getUnlockedGroups(sentence)).toEqual(['core_vocab', 'sound', 'sentence']);
	});

	it('reviewQuestionTypeForChannel maps stage to question type', () => {
		expect(reviewQuestionTypeForChannel('meaning', 0)).toBe('hanzi_to_meaning');
		expect(reviewQuestionTypeForChannel('meaning', 1)).toBe('meaning_to_hanzi');
		expect(reviewQuestionTypeForChannel('meaning', 2)).toBe('meaning_to_hanzi_typed');
		expect(reviewQuestionTypeForChannel('sound', 0)).toBe('sound_to_hanzi');
		expect(reviewQuestionTypeForChannel('sound', 1)).toBe('sound_to_hanzi');
		expect(reviewQuestionTypeForChannel('sound', 2)).toBe('sound_to_hanzi_typed');
		expect(reviewQuestionTypeForChannel('sentence', 0)).toBe('fill_sentence');
		expect(reviewQuestionTypeForChannel('sentence', 2)).toBe('fill_sentence_typed');
	});

	it('typed types require word fields', () => {
		expect(wordSupportsQuestionType(mkWord(), 'meaning_to_hanzi_typed')).toBe(true);
		expect(wordSupportsQuestionType(mkWord({ pinyin: '' }), 'sound_to_hanzi_typed')).toBe(false);
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
		const sum = DEFAULT_GOAL_WEIGHTS.meaning + DEFAULT_GOAL_WEIGHTS.sound + DEFAULT_GOAL_WEIGHTS.sentence;
		expect(sum).toBe(100);
	});

	describe('stage-aware practice types', () => {
		it('uses MCQ2 type when meaningIntervalIdx is 1', () => {
			const word = mkWord();
			const progress = mkProgress({ meaningIntervalIdx: 1, soundIntervalIdx: 0 });
			const types = selectQuestionTypesForWord(word, progress, { group: 'core_vocab', count: 6 });
			expect(types).toContain('meaning_to_hanzi');
			expect(types).not.toContain('hanzi_to_meaning');
		});

		it('uses typed recall when meaningIntervalIdx is 2', () => {
			const word = mkWord();
			const progress = mkProgress({ meaningIntervalIdx: 2, soundIntervalIdx: 0 });
			const types = selectQuestionTypesForWord(word, progress, { group: 'core_vocab', count: 6 });
			expect(types).toContain('meaning_to_hanzi_typed');
			expect(types).not.toContain('hanzi_to_meaning');
			expect(types).not.toContain('meaning_to_hanzi');
		});

		it('assigns each channel its own stage-appropriate type in smart_mixed', () => {
			const word = mkWord();
			const progress = mkProgress({
				meaningIntervalIdx: 2,
				soundIntervalIdx: 1,
			});
			const types = selectQuestionTypesForWord(word, progress, { group: 'smart_mixed', count: 6 });
			expect(types).toContain('meaning_to_hanzi_typed');
			expect(types).toContain('sound_to_hanzi');
			expect(types).toHaveLength(2);
		});

		it('includes sentence channel in smart_mixed when word has fill examples', () => {
			const word = mkWord({
				examples: [{
					id: 'ex1',
					hanzi: '我在学习。',
					pinyin: 'wǒ zài xuéxí.',
					meaningVi: 'Tôi đang học.',
					meaningViTemplate: 'Tôi đang __.',
					targetWordStart: 2,
					targetWordEnd: 4,
					naturalnessStatus: 'auto',
				}],
			});
			const progress = mkProgress({
				meaningIntervalIdx: 0,
				soundIntervalIdx: 0,
				sentenceIntervalIdx: 1,
			});
			const types = selectQuestionTypesForWord(word, progress, {
				group: 'smart_mixed',
				count: 6,
				sessionContext: 'practice',
			});
			expect(types).toContain('fill_sentence');
			expect(types).toHaveLength(3);
		});

		it('uses stage-appropriate sentence type in sentence mode', () => {
			const word = mkWord({
				examples: [{
					id: 'ex1',
					hanzi: '我在学习。',
					pinyin: 'wǒ zài xuéxí.',
					meaningVi: 'Tôi đang học.',
					meaningViTemplate: 'Tôi đang __.',
					targetWordStart: 2,
					targetWordEnd: 4,
					naturalnessStatus: 'auto',
				}],
			});
			const progress = mkProgress({ sentenceIntervalIdx: 2, meaningIntervalIdx: 2, sentenceTotal: 1 });
			const types = selectQuestionTypesForWord(word, progress, { group: 'sentence', count: 3 });
			expect(types).toEqual(['fill_sentence_typed']);
		});

		it('falls back to MCQ pool when progress is null', () => {
			const word = mkWord();
			const types = selectQuestionTypesForWord(word, null, { group: 'core_vocab', count: 6 });
			const mcqOnly = GROUP_QUESTION_MAP.core_vocab;
			for (const t of types) {
				expect(mcqOnly).toContain(t);
			}
		});

		it('uses typed sound when soundIntervalIdx is 2', () => {
			const word = mkWord();
			const progress = mkProgress({ soundIntervalIdx: 2 });
			const types = selectQuestionTypesForWord(word, progress, { group: 'sound', count: 3 });
			expect(types).toEqual(['sound_to_hanzi_typed']);
		});
	});

	describe('reviewQuestionTypeForMaintain', () => {
		it('returns MCQ types when roll < 0.3', () => {
			expect(reviewQuestionTypeForMaintain('meaning', () => 0)).toBe('hanzi_to_meaning');
			expect(reviewQuestionTypeForMaintain('sound', () => 0)).toBe('sound_to_hanzi');
			expect(reviewQuestionTypeForMaintain('sentence', () => 0)).toBe('fill_sentence');
		});

		it('returns typed types when roll >= 0.3', () => {
			expect(reviewQuestionTypeForMaintain('meaning', () => 0.5)).toBe('meaning_to_hanzi_typed');
			expect(reviewQuestionTypeForMaintain('sound', () => 0.5)).toBe('sound_to_hanzi_typed');
			expect(reviewQuestionTypeForMaintain('sentence', () => 0.5)).toBe('fill_sentence_typed');
		});

		it('uses mixed types at maintain stage', () => {
			expect(reviewQuestionTypeForChannel('meaning', 5, () => 0)).toBe('hanzi_to_meaning');
			expect(reviewQuestionTypeForChannel('meaning', 5, () => 0.5)).toBe('meaning_to_hanzi_typed');
		});
	});
});
