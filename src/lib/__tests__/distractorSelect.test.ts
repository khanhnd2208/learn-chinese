import { describe, it, expect } from 'vitest';
import { pickDistractorsForType } from '@/lib/chinese/distractorSelect';
import type { CnWordCardDTO } from '@/types/chinese';

function mkWord(id: string, simplified: string, pinyin: string): CnWordCardDTO {
	return {
		id,
		simplified,
		pinyin,
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

describe('hanzi_to_pinyin distractors', () => {
	it('picks pinyin options from pool', () => {
		const target = mkWord('w1', '老师', 'lǎoshī');
		const pool = [
			target,
			mkWord('w2', '学生', 'xuésheng'),
			mkWord('w3', '你好', 'nǐ hǎo'),
		];
		const distractors = pickDistractorsForType(
			'hanzi_to_pinyin',
			target,
			pool,
			'lǎoshī',
			2,
		);
		expect(distractors).not.toContain('lǎoshī');
		expect(distractors.length).toBeGreaterThan(0);
	});
});
