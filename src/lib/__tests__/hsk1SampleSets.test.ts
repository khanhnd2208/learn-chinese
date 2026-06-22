import { describe, it, expect } from 'vitest';
import {
	GLOBAL_SAMPLE_SET_DESCRIPTION,
	GLOBAL_SAMPLE_SET_TITLES,
	HSK1_SAMPLE_SETS,
	getHsk1SampleSet,
	parseHsk1SampleSetId,
} from '@/lib/chinese/hsk1SampleSets';

describe('hsk1SampleSets', () => {
	it('defines 3 global sample sets with ~20 words each', () => {
		expect(HSK1_SAMPLE_SETS).toHaveLength(3);
		for (const set of HSK1_SAMPLE_SETS) {
			expect(set.words.length).toBeGreaterThanOrEqual(18);
			expect(set.words.length).toBeLessThanOrEqual(22);
			expect(set.description).toBe(GLOBAL_SAMPLE_SET_DESCRIPTION);
			expect(set.filename).toMatch(/^hsk1_bai[123]_.+\.xlsx$/);
		}
	});

	it('fills all word fields and avoids duplicate simplified per set', () => {
		for (const set of HSK1_SAMPLE_SETS) {
			const simplified = set.words.map((w) => w.simplified);
			expect(new Set(simplified).size).toBe(simplified.length);
			for (const word of set.words) {
				expect(word.pinyin.trim()).not.toBe('');
				expect(word.meaningVi.trim()).not.toBe('');
				expect(word.hanViet.trim()).not.toBe('');
				expect(word.partOfSpeech.trim()).not.toBe('');
				expect(word.ghiChu.trim()).not.toBe('');
			}
		}
	});

	it('exposes global titles for idempotency lookup', () => {
		expect(GLOBAL_SAMPLE_SET_TITLES).toEqual(HSK1_SAMPLE_SETS.map((s) => s.boTu));
	});

	it('resolves sample set ids', () => {
		expect(parseHsk1SampleSetId('bai2')).toBe('bai2');
		expect(parseHsk1SampleSetId('BAI3')).toBe('bai3');
		expect(() => parseHsk1SampleSetId('bai9')).toThrow(/Invalid sample set id/);
		expect(getHsk1SampleSet('bai1').boTu).toBe('HSK1 Bài 1 - 你好');
	});
});
