import { describe, it, expect } from 'vitest';
import {
	GROUP_QUESTION_MAP,
	CHANNEL_TO_GROUP,
	getUnlockedGroups,
	getWeakestChannel,
	isChannelUnlocked,
	pickChannelWeighted,
	practiceModeToGroup,
	selectQuestionTypesForWord,
	wordSupportsQuestionType,
} from '@/lib/chinese/practiceTaxonomy';
import { computeNextReview } from '@/services/chinese/cnSrsService';
import { CN_STATE_THRESHOLDS } from '@/config/constants';
import type { CnWordCardDTO, CnWordProgressDTO } from '@/types/chinese';

const sampleWord: CnWordCardDTO = {
	id: 'w1',
	simplified: '学生',
	pinyin: 'xuésheng',
	hanViet: 'HỌC SINH',
	meaningVi: 'học sinh',
	partOfSpeech: 'danh từ',
	mnemonicVi: '',
	hskLevel: 1,
	status: 'published',
	examples: [{ id: 'e1', hanzi: '我是学生。', pinyin: 'Wǒ shì xuésheng.', meaningVi: 'Tôi là học sinh.' }],
	patterns: [{ id: 'p1', template: '我是 + N', samples: [{ hanzi: '我是学生。', pinyin: 'Wǒ shì xuésheng.', meaningVi: 'Tôi là học sinh.' }] }],
	chars: [
		{ id: 'h1', char: '学', pinyin: 'xué', hanViet: 'HỌC', meaningVi: 'học', components: [], radical: '子', mnemonicVi: '', similarGroupId: null, status: 'published', position: 0 },
	],
	relatedWords: [],
};

function mkProgress(overrides: Partial<CnWordProgressDTO> = {}): CnWordProgressDTO {
	return {
		wordId: 'w1',
		state: 'learning',
		dueAt: new Date().toISOString(),
		intervalIdx: 1,
		lastReviewedAt: null,
		meaningRate: 80,
		listeningRate: 80,
		pinyinRate: 80,
		sentenceRate: 80,
		charRate: 80,
		meaningTotal: 5,
		listeningTotal: 5,
		pinyinTotal: 5,
		sentenceTotal: 5,
		charTotal: 5,
		meaningIntervalIdx: 0,
		listeningIntervalIdx: 0,
		pinyinIntervalIdx: 0,
		sentenceIntervalIdx: 0,
		hanziIntervalIdx: 0,
		...overrides,
	};
}

describe('practiceTaxonomy', () => {
	it('maps practice modes including legacy aliases', () => {
		expect(practiceModeToGroup('mixed')).toBe('smart_mixed');
		expect(practiceModeToGroup('sentence')).toBe('sentence_usage');
		expect(practiceModeToGroup('core_vocab')).toBe('core_vocab');
		expect(practiceModeToGroup('hanzi_memory')).toBe('hanzi_memory');
	});

	it('channel unlock gates sentence and hanzi until meaning is familiar', () => {
		expect(isChannelUnlocked(null, 'meaning')).toBe(true);
		expect(isChannelUnlocked(null, 'sentence')).toBe(false);
		expect(isChannelUnlocked(null, 'hanzi')).toBe(false);
		expect(isChannelUnlocked(mkProgress({ meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar }), 'sentence')).toBe(true);
		expect(isChannelUnlocked(mkProgress({ meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar }), 'hanzi')).toBe(true);
	});

	it('getUnlockedGroups excludes sentence for new words', () => {
		expect(getUnlockedGroups(null)).toEqual(['core_vocab', 'listening']);
		expect(getUnlockedGroups(null)).not.toContain('sentence_usage');
		expect(getUnlockedGroups(null)).not.toContain('hanzi_memory');
	});

	it('getUnlockedGroups opens sentence when meaning channel is familiar+', () => {
		const groups = getUnlockedGroups(mkProgress({ meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar }));
		expect(groups).toContain('sentence_usage');
		expect(groups).toContain('hanzi_memory');
	});

	it('getUnlockedGroups drops core_vocab for mastered words', () => {
		const groups = getUnlockedGroups(mkProgress({ state: 'mastered', meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar }));
		expect(groups).not.toContain('core_vocab');
		expect(groups).toContain('listening');
	});

	it('selectQuestionTypesForWord respects unlock for new words', () => {
		const types = selectQuestionTypesForWord(sampleWord, null, { group: 'smart_mixed', count: 10 });
		const allowed = [...GROUP_QUESTION_MAP.core_vocab, ...GROUP_QUESTION_MAP.listening];
		for (const t of types) {
			expect(allowed).toContain(t);
		}
	});

	it('selectQuestionTypesForWord prioritizes listening when that channel is weakest', () => {
		const progress = mkProgress({ listeningRate: 30, meaningRate: 90, state: 'weak' });
		const types = selectQuestionTypesForWord(sampleWord, progress, { group: 'smart_mixed', count: 6 });
		const listeningTypes = GROUP_QUESTION_MAP.listening;
		expect(types.some((t) => listeningTypes.includes(t))).toBe(true);
	});

	it('selectQuestionTypesForWord targets a specific channel when requested', () => {
		const progress = mkProgress({ meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar });
		const types = selectQuestionTypesForWord(sampleWord, progress, {
			group: 'sentence_usage',
			count: 4,
			targetChannel: 'sentence',
		});
		const sentenceTypes = GROUP_QUESTION_MAP.sentence_usage;
		expect(types[0]).toBeDefined();
		expect(sentenceTypes).toContain(types[0]);
	});

	it('getWeakestChannel picks listening when it has lowest rate among unlocked channels', () => {
		const progress = mkProgress({
			listeningRate: 20,
			meaningRate: 90,
			pinyinRate: 85,
			meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar,
		});
		expect(getWeakestChannel(progress)).toBe('listening');
	});

	it('getWeakestChannel ignores locked sentence channel', () => {
		const progress = mkProgress({
			sentenceRate: 0,
			sentenceTotal: 0,
			meaningRate: 90,
			meaningIntervalIdx: 0,
		});
		expect(getWeakestChannel(progress)).not.toBe('sentence');
	});

	it('pickChannelWeighted returns one of the candidate channels', () => {
		const progress = mkProgress({ meaningIntervalIdx: CN_STATE_THRESHOLDS.familiar });
		const channels = ['meaning', 'listening', 'sentence'] as const;
		const picked = pickChannelWeighted(progress, [...channels]);
		expect(channels).toContain(picked);
	});

	it('CHANNEL_TO_GROUP maps channels to practice groups', () => {
		expect(CHANNEL_TO_GROUP.sentence).toBe('sentence_usage');
		expect(CHANNEL_TO_GROUP.hanzi).toBe('hanzi_memory');
	});

	it('wordSupportsQuestionType gates sentence types by data', () => {
		expect(wordSupportsQuestionType(sampleWord, 'fill_sentence')).toBe(true);
		expect(wordSupportsQuestionType(sampleWord, 'translate_sentence')).toBe(true);
		const bare: CnWordCardDTO = { ...sampleWord, examples: [], patterns: [] };
		expect(wordSupportsQuestionType(bare, 'fill_sentence')).toBe(false);
		expect(wordSupportsQuestionType(bare, 'translate_sentence')).toBe(false);
	});
});

describe('computeNextReview confidence & production gate', () => {
	it('MCQ high confidence does not double-step', () => {
		const mcq = computeNextReview({
			intervalIdx: 0,
			correct: true,
			now: new Date('2025-01-01'),
			confidence: 1.0,
			isProduction: false,
		});
		const production = computeNextReview({
			intervalIdx: 0,
			correct: true,
			now: new Date('2025-01-01'),
			confidence: 1.0,
			isProduction: true,
		});
		expect(production.intervalIdx).toBeGreaterThan(mcq.intervalIdx);
	});

	it('light lapse does not reset to index 0', () => {
		const result = computeNextReview({
			intervalIdx: 6,
			correct: false,
			now: new Date('2025-01-01'),
			lapseSeverity: 'light',
		});
		expect(result.intervalIdx).toBe(5);
		expect(result.state).toBe('weak');
	});
});
