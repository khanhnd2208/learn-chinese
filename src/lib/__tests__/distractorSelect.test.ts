import { describe, it, expect } from 'vitest';
import { pickDistractorsForType } from '@/lib/chinese/distractorSelect';
import type { CnWordCardDTO } from '@/types/chinese';

function mkWord(id: string, simplified: string, partOfSpeech = ''): CnWordCardDTO {
	return {
		id,
		simplified,
		pinyin: '',
		hanViet: '',
		meaningVi: simplified,
		partOfSpeech,
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published',
		examples: [],
		patterns: [],
		chars: [],
		relatedWords: [],
	};
}

describe('fill_sentence distractors', () => {
	it('excludes words that appear in the example sentence', () => {
		const target = mkWord('w1', '老师', 'noun');
		const pool = [
			target,
			mkWord('w2', '学生', 'noun'),
			mkWord('w3', '是', 'verb'),
			mkWord('w4', '人', 'noun'),
		];
		const distractors = pickDistractorsForType(
			'fill_sentence',
			target,
			pool,
			'老师',
			3,
			[],
			'他是老师。',
		);
		expect(distractors).not.toContain('是');
		expect(distractors.length).toBeGreaterThan(0);
	});
});
