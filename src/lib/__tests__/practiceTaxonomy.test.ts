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
	selectQuestionTypesForWord,
	wordSupportsQuestionType,
} from '@/lib/chinese/practiceTaxonomy';
import { CN_STATE_THRESHOLDS } from '@/config/constants';
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
		state: 'learning',
		dueAt: new Date().toISOString(),
		intervalIdx: 0,
		lastReviewedAt: null,
		meaningRate: 80,
		listeningRate: 70,
		pinyinRate: 60,
		sentenceRate: 50,
		meaningTotal: 5,
		listeningTotal: 3,
		pinyinTotal: 2,
		sentenceTotal: 1,
		meaningIntervalIdx: 0,
		listeningIntervalIdx: 0,
		pinyinIntervalIdx: 0,
		sentenceIntervalIdx: 0,
		...overrides,
	};
}

describe('practiceTaxonomy (6 core types)', () => {
	it('has 4 SRS channels and 6 question types in groups', () => {
		expect(ALL_SKILL_CHANNELS).toEqual(['meaning', 'listening', 'pinyin', 'sentence']);
		const grouped = Object.values(GROUP_QUESTION_MAP).flat();
		expect(new Set(grouped).size).toBe(6);
		expect([...new Set(grouped)].sort()).toEqual([...CORE_QUESTION_TYPES].sort());
	});

	it('maps channels to practice groups', () => {
		expect(CHANNEL_TO_GROUP.meaning).toBe('core_vocab');
		expect(CHANNEL_TO_GROUP.listening).toBe('listening');
		expect(CHANNEL_TO_GROUP.sentence).toBe('sentence_usage');
	});

	it('practice modes map to 4 groups + smart_mixed', () => {
		expect(practiceModeToGroup('smart_mixed')).toBe('smart_mixed');
		expect(practiceModeToGroup('core_vocab')).toBe('core_vocab');
		expect(practiceModeToGroup('listening')).toBe('listening');
		expect(practiceModeToGroup('sentence_usage')).toBe('sentence_usage');
		expect(practiceModeToGroup('unknown')).toBe('smart_mixed');
	});

	it('sentence channel unlocks when meaning is familiar', () => {
		expect(isChannelUnlocked(null, 'sentence')).toBe(false);
		expect(isChannelUnlocked(mkProgress({ meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar - 1 }), 'sentence')).toBe(false);
		expect(isChannelUnlocked(mkProgress({ meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar }), 'sentence')).toBe(true);
	});

	it('getUnlockedGroups excludes sentence until familiar', () => {
		expect(getUnlockedGroups(null)).toEqual(['core_vocab', 'listening']);
		const groups = getUnlockedGroups(mkProgress({ meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar }));
		expect(groups).toContain('sentence_usage');
	});

	it('fill_sentence requires verified example with offsets', () => {
		const word = mkWord({
			examples: [{
				id: 'e1',
				hanzi: '我每天学习中文。',
				pinyin: '',
				meaningVi: '',
				targetWordStart: 3,
				targetWordEnd: 5,
				naturalnessStatus: 'verified',
			}],
		});
		expect(wordSupportsQuestionType(word, 'fill_sentence')).toBe(true);
		expect(wordSupportsQuestionType(mkWord({
			examples: [{ id: 'e1', hanzi: '我每天学习中文。', pinyin: '', meaningVi: '' }],
		}), 'fill_sentence')).toBe(false);
	});

	it('selectQuestionTypesForWord returns only supported core types', () => {
		const word = mkWord();
		const types = selectQuestionTypesForWord(word, null, { group: 'smart_mixed', count: 6 });
		for (const t of types) {
			expect(CORE_QUESTION_TYPES).toContain(t);
			expect(wordSupportsQuestionType(word, t)).toBe(true);
		}
	});

	it('goal weights sum to 100 without hanzi channel', () => {
		const sum = DEFAULT_GOAL_WEIGHTS.meaning + DEFAULT_GOAL_WEIGHTS.listening
			+ DEFAULT_GOAL_WEIGHTS.pinyin + DEFAULT_GOAL_WEIGHTS.sentence;
		expect(sum).toBe(100);
	});
});
