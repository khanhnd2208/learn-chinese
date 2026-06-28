import { describe, expect, it } from 'vitest';
import {
	completeSentenceMeaning,
	completeSentenceTemplate,
	getSentenceTypography,
	hanCharCount,
	resolveWrongAnswerReveal,
} from '@/lib/chinese/questionDisplay';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

function baseQuestion(overrides: Partial<CnPracticeQuestionDTO>): CnPracticeQuestionDTO {
	return {
		id: 'q1',
		wordId: 'w1',
		type: 'hanzi_to_meaning',
		prompt: 'test',
		correctAnswer: 'học tập',
		...overrides,
	};
}

describe('resolveWrongAnswerReveal', () => {
	it('hanzi_to_meaning: meaning primary, pinyin secondary — no hanzi repeat', () => {
		const reveal = resolveWrongAnswerReveal(baseQuestion({
			type: 'hanzi_to_meaning',
			hanzi: '学习',
			pinyin: 'xué xí',
			correctAnswer: 'học tập',
		}));
		expect(reveal.mode).toBe('word');
		expect(reveal.primary).toEqual({ kind: 'meaning', text: 'học tập' });
		expect(reveal.secondary).toEqual({ kind: 'pinyin', text: 'xué xí' });
		expect(reveal.primary.text).not.toBe('学习');
	});

	it('meaning_to_hanzi: hanzi primary, pinyin secondary', () => {
		const reveal = resolveWrongAnswerReveal(baseQuestion({
			type: 'meaning_to_hanzi',
			meaningVi: 'học tập',
			pinyin: 'xué xí',
			correctAnswer: '学习',
		}));
		expect(reveal.primary).toEqual({ kind: 'hanzi', text: '学习' });
		expect(reveal.secondary).toEqual({ kind: 'pinyin', text: 'xué xí' });
	});

	it('hanzi_to_pinyin_typed: pinyin only, no hanzi repeat', () => {
		const reveal = resolveWrongAnswerReveal(baseQuestion({
			type: 'hanzi_to_pinyin_typed',
			hanzi: '学习',
			correctAnswer: 'xué xí',
		}));
		expect(reveal.primary).toEqual({ kind: 'pinyin', text: 'xué xí' });
		expect(reveal.secondary).toBeUndefined();
	});

	it('audio_to_hanzi: full word info for audio mode', () => {
		const reveal = resolveWrongAnswerReveal(baseQuestion({
			type: 'audio_to_hanzi',
			hanzi: '学习',
			pinyin: 'xué xí',
			meaningVi: 'học tập; học hỏi',
			correctAnswer: '学习',
			audioText: '学习',
		}));
		expect(reveal.mode).toBe('audio');
		expect(reveal.primary).toEqual({ kind: 'hanzi', text: '学习' });
		expect(reveal.secondary).toEqual({ kind: 'pinyin', text: 'xué xí' });
		expect(reveal.tertiary).toEqual({ kind: 'meaning', text: 'học tập' });
	});

	it('audio_to_meaning: meaning primary with hanzi and pinyin', () => {
		const reveal = resolveWrongAnswerReveal(baseQuestion({
			type: 'audio_to_meaning',
			hanzi: '学习',
			pinyin: 'xué xí',
			correctAnswer: 'học tập',
			audioText: '学习',
		}));
		expect(reveal.mode).toBe('audio');
		expect(reveal.primary).toEqual({ kind: 'meaning', text: 'học tập' });
		expect(reveal.secondary).toEqual({ kind: 'hanzi', text: '学习' });
		expect(reveal.tertiary).toEqual({ kind: 'pinyin', text: 'xué xí' });
	});

	it('fill_sentence: sentence mode with completed sentence and fill word', () => {
		const reveal = resolveWrongAnswerReveal(baseQuestion({
			type: 'fill_sentence',
			sentenceTemplate: '我____学习中文。',
			sentenceMeaningVi: 'Tôi __ học tiếng Trung.',
			pinyin: 'wǒ xǐ huan xuéxí zhōngwén',
			wordPinyin: 'xǐ huan',
			meaningVi: 'thích; yêu thích',
			correctAnswer: '喜欢',
		}));
		expect(reveal.mode).toBe('sentence');
		expect(reveal.sentence?.hanzi).toBe('我喜欢学习中文。');
		expect(reveal.sentence?.meaningVi).toBe('Tôi thích học tiếng Trung.');
		expect(reveal.fillWord?.hanzi).toBe('喜欢');
		expect(reveal.fillWord?.pinyin).toBe('xǐ huan');
		expect(reveal.fillWord?.meaningVi).toBe('thích');
	});
});

describe('getSentenceTypography', () => {
	it('uses largest size for short sentences', () => {
		expect(getSentenceTypography('我喜欢学习。').hanziClass).toContain('text-2xl');
	});

	it('scales down for long sentences', () => {
		const long = '我非常喜欢在北京学习中文因为很有意思还有朋友。';
		expect(hanCharCount(long)).toBeGreaterThan(20);
		expect(getSentenceTypography(long).hanziClass).toContain('text-lg');
	});
});

describe('sentence helpers', () => {
	it('completeSentenceTemplate fills blanks', () => {
		expect(completeSentenceTemplate('我____学习。', '喜欢')).toBe('我喜欢学习。');
	});

	it('completeSentenceMeaning fills meaning blank', () => {
		expect(completeSentenceMeaning('Tôi __ học.', 'thích')).toBe('Tôi thích học.');
	});
});
