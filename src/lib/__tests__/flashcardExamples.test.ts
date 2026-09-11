import { describe, expect, it } from 'vitest';
import {
	buildFlashcardCards,
	fillBlankTokens,
	hasBlankToken,
	highlightTargetSegments,
	nextExampleIndex,
	selectFlashcardExamples,
	shuffleArray,
	toFlashcardExample,
	type FlashcardWordSource,
} from '@/lib/chinese/flashcardExamples';

const word: FlashcardWordSource = {
	id: 'w1',
	simplified: '老师',
	pinyin: 'lǎoshī',
	meaningVi: 'giáo viên',
	examples: [],
};

describe('flashcard blank tokens', () => {
	it('detects fill blanks and restores them from stored word fields', () => {
		expect(hasBlankToken('他是__。')).toBe(true);
		expect(hasBlankToken('tā shì [BLANK].')).toBe(true);
		expect(hasBlankToken('他是老师。')).toBe(false);
		expect(fillBlankTokens('tā shì __.', 'lǎoshī')).toBe('tā shì lǎoshī.');
		expect(fillBlankTokens('他是[BLANK]。', '老师')).toBe('他是老师。');
	});
});

describe('toFlashcardExample', () => {
	it('keeps complete sentences and valid target offsets', () => {
		const dto = toFlashcardExample({
			id: 'e1',
			hanzi: '他是老师。',
			pinyin: 'Tā shì lǎoshī.',
			meaningVi: 'Anh ấy là giáo viên.',
			naturalnessStatus: 'verified',
			targetWordStart: 2,
			targetWordEnd: 4,
		}, word);
		expect(dto).toEqual({
			id: 'e1',
			hanzi: '他是老师。',
			pinyin: 'Tā shì lǎoshī.',
			meaningVi: 'Anh ấy là giáo viên.',
			targetWordStart: 2,
			targetWordEnd: 4,
		});
	});

	it('rejects examples still missing hanzi or pinyin after restoring blanks', () => {
		expect(toFlashcardExample({
			id: 'e-empty',
			hanzi: '',
			pinyin: 'Tā shì lǎoshī.',
			meaningVi: 'Anh ấy là giáo viên.',
		}, word)).toBeNull();
		expect(toFlashcardExample({
			id: 'e-blank-pinyin',
			hanzi: '他是老师。',
			pinyin: '',
			meaningVi: 'Anh ấy là giáo viên.',
		}, word)).toBeNull();
		expect(toFlashcardExample({
			id: 'e-leftover',
			hanzi: '他是__老师。',
			pinyin: 'Tā shì lǎoshī.',
			meaningVi: 'Anh ấy là giáo viên.',
		}, { ...word, simplified: '' })).toBeNull();
	});

	it('clears invalid target offsets instead of highlighting the wrong span', () => {
		const dto = toFlashcardExample({
			id: 'e2',
			hanzi: '他是老师。',
			pinyin: 'Tā shì lǎoshī.',
			meaningVi: 'Anh ấy là giáo viên.',
			targetWordStart: 0,
			targetWordEnd: 1,
		}, word);
		expect(dto?.targetWordStart).toBe(2);
		expect(dto?.targetWordEnd).toBe(4);
	});
});

describe('selectFlashcardExamples', () => {
	it('ranks verified then auto then draft, preferring complete translations', () => {
		const selected = selectFlashcardExamples({
			...word,
			examples: [
				{
					id: 'draft',
					hanzi: '老师好！',
					pinyin: 'Lǎoshī hǎo!',
					meaningVi: 'Chào giáo viên!',
					naturalnessStatus: 'draft',
				},
				{
					id: 'auto-no-meaning',
					hanzi: '他是老师。',
					pinyin: 'Tā shì lǎoshī.',
					meaningVi: '',
					naturalnessStatus: 'auto',
				},
				{
					id: 'verified',
					hanzi: '她是老师。',
					pinyin: 'Tā shì lǎoshī.',
					meaningVi: 'Cô ấy là giáo viên.',
					naturalnessStatus: 'verified',
				},
				{
					id: 'auto-meaning',
					hanzi: '我的老师很好。',
					pinyin: 'Wǒ de lǎoshī hěn hǎo.',
					meaningVi: 'Giáo viên của tôi rất tốt.',
					naturalnessStatus: 'auto',
				},
			],
		});
		expect(selected.map((example) => example.id)).toEqual([
			'verified',
			'auto-meaning',
			'auto-no-meaning',
			'draft',
		]);
	});

	it('restores fill-blank pinyin from the word instead of inventing a new sentence', () => {
		const selected = selectFlashcardExamples({
			...word,
			examples: [{
				id: 'fill',
				hanzi: '他是老师。',
				pinyin: 'tā shì [BLANK].',
				meaningVi: 'Anh ấy là __.',
				naturalnessStatus: 'auto',
				targetWordStart: 2,
				targetWordEnd: 4,
			}],
		});
		expect(selected).toEqual([{
			id: 'fill',
			hanzi: '他是老师。',
			pinyin: 'tā shì lǎoshī.',
			meaningVi: 'Anh ấy là giáo viên.',
			targetWordStart: 2,
			targetWordEnd: 4,
		}]);
	});

	it('cycles examples in ranked order', () => {
		expect(nextExampleIndex(0, 3)).toBe(1);
		expect(nextExampleIndex(2, 3)).toBe(0);
		expect(nextExampleIndex(0, 0)).toBe(0);
	});
});

describe('highlightTargetSegments', () => {
	it('highlights a verified span and falls back to the full sentence', () => {
		expect(highlightTargetSegments('他是老师。', '老师', 2, 4)).toEqual([
			{ text: '他是', highlight: false },
			{ text: '老师', highlight: true },
			{ text: '。', highlight: false },
		]);
		expect(highlightTargetSegments('大家好。', '老师', 0, 2)).toEqual([
			{ text: '大家好。', highlight: false },
		]);
	});
});

describe('shuffleArray', () => {
	it('keeps the same cards without duplicates', () => {
		const cards = ['a', 'b', 'c', 'd'];
		const shuffled = shuffleArray(cards, () => 0);
		expect(shuffled).toHaveLength(4);
		expect(new Set(shuffled)).toEqual(new Set(cards));
		expect(cards).toEqual(['a', 'b', 'c', 'd']);
	});
});

describe('buildFlashcardCards', () => {
	it('skips unlinked items and words missing core fields', () => {
		const { cards, skippedCount } = buildFlashcardCards([
			{ id: 'i1', wordId: null, word: null },
			{
				id: 'i2',
				wordId: 'w-empty',
				word: { id: 'w-empty', simplified: '你', pinyin: '', meaningVi: 'bạn', examples: [] },
			},
			{
				id: 'i3',
				wordId: 'w1',
				word: {
					...word,
					examples: [{
						id: 'e1',
						hanzi: '他是老师。',
						pinyin: 'Tā shì lǎoshī.',
						meaningVi: 'Anh ấy là giáo viên.',
						naturalnessStatus: 'auto',
						targetWordStart: 2,
						targetWordEnd: 4,
					}],
				},
			},
		]);
		expect(skippedCount).toBe(2);
		expect(cards).toHaveLength(1);
		expect(cards[0]?.simplified).toBe('老师');
		expect(cards[0]?.examples).toHaveLength(1);
	});
});
