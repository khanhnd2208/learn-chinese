import { describe, it, expect } from 'vitest';
import { uniqueTerms, splitHanzi, isValidHanziTerm } from '@/lib/chinese/hanziUtils';

describe('hanziUtils / lookup helpers', () => {
	it('splits hanzi characters', () => {
		expect(splitHanzi('学生')).toEqual(['学', '生']);
	});

	it('deduplicates terms', () => {
		expect(uniqueTerms(['学生', ' 学生 ', '老师', ''])).toEqual(['学生', '老师']);
	});

	it('validates hanzi terms', () => {
		expect(isValidHanziTerm('学生')).toBe(true);
		expect(isValidHanziTerm('hello')).toBe(false);
	});
});

describe('lookup status logic', () => {
	function resolveStatus(hasWord: boolean, hasChars: boolean): 'full' | 'charsOnly' | 'none' {
		if (hasWord) return 'full';
		if (hasChars) return 'charsOnly';
		return 'none';
	}

	it('returns full when word exists', () => {
		expect(resolveStatus(true, true)).toBe('full');
	});

	it('returns charsOnly when only chars exist', () => {
		expect(resolveStatus(false, true)).toBe('charsOnly');
	});

	it('returns none when no data', () => {
		expect(resolveStatus(false, false)).toBe('none');
	});
});
