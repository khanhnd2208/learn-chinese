import { describe, it, expect } from 'vitest';
import {
	isVerifiedFillExample,
	isFillExample,
	blankVerifiedExample,
	fullMeaningViForExample,
	pickVerifiedFillExample,
	pickFillExample,
	enrichExampleDtoForFill,
	wordSupportsFillSentence,
} from '@/lib/chinese/verifiedExample';
import type { CnExampleDTO, CnWordCardDTO } from '@/types/chinese';

describe('verifiedExample', () => {
	const verifiedExample: CnExampleDTO = {
		id: 'e1',
		hanzi: '我每天学习中文。',
		pinyin: '',
		meaningVi: 'Mỗi ngày tôi học tiếng Trung.',
		targetWordStart: 3,
		targetWordEnd: 5,
		naturalnessStatus: 'verified',
	};

	const autoExample: CnExampleDTO = {
		id: 'e2',
		hanzi: '他是老师。',
		pinyin: '',
		meaningVi: 'Anh ấy là giáo viên.',
		targetWordStart: 2,
		targetWordEnd: 4,
		naturalnessStatus: 'auto',
	};

	const word: CnWordCardDTO = {
		id: 'w1',
		simplified: '学习',
		pinyin: 'xuéxí',
		hanViet: '',
		meaningVi: 'học tập',
		partOfSpeech: '',
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published',
		examples: [autoExample, verifiedExample],
		patterns: [],
		chars: [],
		relatedWords: [],
	};

	const teacherWord: CnWordCardDTO = {
		...word,
		id: 'w2',
		simplified: '老师',
		examples: [autoExample],
	};

	it('accepts verified example with matching slice', () => {
		expect(isVerifiedFillExample(verifiedExample, '学习')).toBe(true);
	});

	it('accepts auto example via isFillExample', () => {
		expect(isFillExample(autoExample, '老师')).toBe(true);
		expect(isVerifiedFillExample(autoExample, '老师')).toBe(false);
	});

	it('rejects draft or missing offsets', () => {
		expect(isFillExample({ ...verifiedExample, naturalnessStatus: 'draft' }, '学习')).toBe(false);
		expect(isFillExample({ ...verifiedExample, targetWordStart: null }, '学习')).toBe(false);
	});

	it('blanks at verified offsets', () => {
		expect(blankVerifiedExample(verifiedExample)).toBe('我每天____中文。');
		expect(blankVerifiedExample(autoExample)).toBe('他是____。');
	});

	it('fullMeaningViForExample prefers a complete Vietnamese sentence', () => {
		expect(fullMeaningViForExample(verifiedExample, 'học; học tập')).toBe('Mỗi ngày tôi học tiếng Trung.');
	});

	it('fullMeaningViForExample fills a blanked template with the primary meaning', () => {
		const blanked: CnExampleDTO = {
			...verifiedExample,
			meaningVi: 'Tôi __ tiếng Trung mỗi ngày.',
			meaningViTemplate: 'Tôi __ tiếng Trung mỗi ngày.',
		};
		expect(fullMeaningViForExample(blanked, 'học; học tập')).toBe('Tôi học tiếng Trung mỗi ngày.');
	});

	it('fullMeaningViForExample returns null when neither gloss is usable', () => {
		const empty: CnExampleDTO = {
			...verifiedExample,
			meaningVi: '   ',
			meaningViTemplate: 'không có chỗ trống',
		};
		expect(fullMeaningViForExample(empty, 'học')).toBeNull();
	});

	it('pickVerifiedFillExample returns verified only', () => {
		expect(pickVerifiedFillExample(word)?.id).toBe('e1');
	});

	it('pickFillExample picks randomly via injected rng', () => {
		const multiWord: CnWordCardDTO = {
			...teacherWord,
			examples: [
				{ ...autoExample, id: 'e2' },
				{
					id: 'e3',
					hanzi: '我的老师很好。',
					pinyin: '',
					meaningVi: 'Giáo viên của tôi rất tốt.',
					targetWordStart: 2,
					targetWordEnd: 4,
					naturalnessStatus: 'auto',
				},
			],
		};
		expect(pickFillExample(multiWord, ['auto'], () => 0)?.id).toBe('e2');
		expect(pickFillExample(multiWord, ['auto'], () => 0.99)?.id).toBe('e3');
	});

	it('pickFillExample only returns qualifying examples over many runs', () => {
		const validIds = new Set(['e2', 'e3']);
		const multiWord: CnWordCardDTO = {
			...teacherWord,
			examples: [
				{ ...autoExample, id: 'e2' },
				{
					id: 'e3',
					hanzi: '我的老师很好。',
					pinyin: '',
					meaningVi: 'Giáo viên của tôi rất tốt.',
					targetWordStart: 2,
					targetWordEnd: 4,
					naturalnessStatus: 'auto',
				},
				{
					id: 'e4',
					hanzi: 'draft only',
					pinyin: '',
					meaningVi: '',
					targetWordStart: null,
					targetWordEnd: null,
					naturalnessStatus: 'draft',
				},
			],
		};
		for (let i = 0; i < 100; i++) {
			const picked = pickFillExample(multiWord);
			expect(validIds.has(picked!.id)).toBe(true);
		}
	});

	it('pickFillExample falls back to auto when no verified', () => {
		expect(pickFillExample(teacherWord)?.id).toBe('e2');
	});

	it('pickFillExample avoids excludeId when other candidates exist', () => {
		const multiWord: CnWordCardDTO = {
			...teacherWord,
			examples: [
				{ ...autoExample, id: 'e2' },
				{
					id: 'e3',
					hanzi: '我的老师很好。',
					pinyin: '',
					meaningVi: 'Giáo viên của tôi rất tốt.',
					targetWordStart: 2,
					targetWordEnd: 4,
					naturalnessStatus: 'auto',
				},
			],
		};
		expect(pickFillExample(multiWord, ['auto'], () => 0, 'e2')?.id).toBe('e3');
		expect(pickFillExample(multiWord, ['auto'], () => 0, 'e3')?.id).toBe('e2');
	});

	it('enriches draft examples missing offsets when target appears once in hanzi', () => {
		const draftExample: CnExampleDTO = {
			id: 'e-draft',
			hanzi: '我是学生。',
			pinyin: 'wǒ shì xuésheng.',
			meaningVi: 'Tôi là học sinh.',
			naturalnessStatus: 'draft',
		};
		const enriched = enrichExampleDtoForFill(draftExample, '学生');
		expect(enriched.naturalnessStatus).toBe('auto');
		expect(enriched.targetWordStart).toBe(2);
		expect(enriched.targetWordEnd).toBe(4);
		expect(wordSupportsFillSentence({
			...word,
			simplified: '学生',
			examples: [enriched],
		})).toBe(true);
	});
});
