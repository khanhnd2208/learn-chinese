import { describe, it, expect } from 'vitest';
import { pickDistractorsForType } from '@/lib/chinese/distractorSelect';
import type { CnWordCardDTO } from '@/types/chinese';

function mkWord(id: string, simplified: string, pinyin: string): CnWordCardDTO {
	return {
		id,
		simplified,
		pinyin,
		pinyinPlain: pinyin.replace(/[1-5]/g, ''),
		hanViet: '',
		meaningVi: simplified,
		partOfSpeech: '',
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published',
		examples: [],
		patterns: [],
		chars: [],
		relatedWords: [],
	};
}

describe('sound_to_hanzi distractors', () => {
	it('picks hanzi options from pool', () => {
		const target = mkWord('w1', '老师', 'lǎoshī');
		const pool = [
			target,
			mkWord('w2', '学生', 'xuésheng'),
			mkWord('w3', '你好', 'nǐ hǎo'),
		];
		const distractors = pickDistractorsForType(
			'sound_to_hanzi',
			target,
			pool,
			'老师',
			2,
		);
		expect(distractors).not.toContain('老师');
		expect(distractors.length).toBeGreaterThan(0);
	});

	it('hard mode accepts hardMode flag without error', () => {
		const target = mkWord('w1', '老师', 'lǎoshī');
		const pool = [
			target,
			mkWord('w2', '老时', 'lǎoshí'),
			mkWord('w3', '你好', 'nǐ hǎo'),
		];
		const hard = pickDistractorsForType('sound_to_hanzi', target, pool, '老师', 2, [], true);
		expect(hard).not.toContain('老师');
		expect(hard.length).toBe(2);
	});
});

describe('fill_sentence distractors', () => {
	it('leaves out words that are already accepted for the sentence', () => {
		const target = mkWord('w1', '都', 'dōu');
		const pool = [
			target,
			mkWord('w2', '也', 'yě'),
			mkWord('w3', '还', 'hái'),
			mkWord('w4', '很', 'hěn'),
		];
		const distractors = pickDistractorsForType(
			'fill_sentence',
			target,
			pool,
			'都',
			3,
			[],
			false,
			['也'],
		);
		expect(distractors).not.toContain('也');
		expect(distractors).toEqual(expect.arrayContaining(['还', '很']));
	});
});
