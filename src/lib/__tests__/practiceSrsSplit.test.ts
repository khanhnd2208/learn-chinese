import { describe, it, expect } from 'vitest';
import { enrichQuestionWithProgress } from '@/lib/chinese/generateQuestions';
import { wordEligibleForIntegrated } from '@/lib/chinese/integratedRecall';
import { canMarkChannelKnown } from '@/services/chinese/cnSrsService';
import { CN_MARK_KNOWN_HIDE_IDX } from '@/config/constants';
import type { CnPracticeQuestionDTO, CnWordCardDTO } from '@/types/chinese';
import type { CnWordProgress } from '@prisma/client';

const baseQuestion: CnPracticeQuestionDTO = {
	id: 'q1',
	wordId: 'w1',
	type: 'hanzi_to_meaning',
	prompt: 'test',
	correctAnswer: 'a',
	options: ['a', 'b'],
	hanzi: '你',
};

const baseWord: CnWordCardDTO = {
	id: 'w1',
	simplified: '你好',
	pinyin: 'nǐ hǎo',
	hanViet: 'nhĩ hảo',
	meaningVi: 'xin chào',
	partOfSpeech: '',
	mnemonicVi: '',
	hskLevel: 1,
	status: 'published',
	chars: [],
	examples: [{ id: 'e1', hanzi: '你好', pinyin: 'nǐ hǎo', meaningVi: 'xin chào' }],
	patterns: [],
	relatedWords: [],
};

describe('enrichQuestionWithProgress', () => {
	it('does not allow mark-known in practice mode', () => {
		const q = enrichQuestionWithProgress(baseQuestion, null, false);
		expect(q.canMarkKnown).toBe(false);
	});

	it('allows mark-known in review when channel is weak', () => {
		const q = enrichQuestionWithProgress(baseQuestion, {
			meaningIntervalIdx: 0,
		} as never, true);
		expect(q.canMarkKnown).toBe(true);
	});
});

describe('wordEligibleForIntegrated', () => {
	it('eligible without SRS progress when word has content', () => {
		expect(wordEligibleForIntegrated(baseWord)).toBe(true);
	});

	it('ineligible without example', () => {
		expect(wordEligibleForIntegrated({ ...baseWord, examples: [] })).toBe(false);
	});
});

describe('canMarkChannelKnown policy', () => {
	it('rejects mark-known when channel interval is strong', () => {
		const p = {
			meaningIntervalIdx: CN_MARK_KNOWN_HIDE_IDX,
		} as CnWordProgress;
		expect(canMarkChannelKnown(p, 'meaning')).toBe(false);
	});
});
