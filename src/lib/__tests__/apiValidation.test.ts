import { describe, it, expect } from 'vitest';
import {
	validatePracticeSubmitItems,
	validateSetTerms,
	validateImportFile,
} from '@/lib/apiValidation';

describe('apiValidation', () => {
	it('accepts valid practice submit items', () => {
		expect(validatePracticeSubmitItems([
			{ wordId: 'w1', questionType: 'hanzi_to_meaning', correct: true },
			{ wordId: 'w2', questionType: 'fill_sentence', correct: false, errorType: 'sai_nghia' },
		])).toBe(true);
	});

	it('rejects invalid questionType, empty items, and oversize batch', () => {
		expect(validatePracticeSubmitItems([])).toBe(false);
		expect(validatePracticeSubmitItems([{ wordId: 'w1', questionType: 'invalid', correct: true }])).toBe(false);
		expect(validatePracticeSubmitItems(Array.from({ length: 201 }, (_, i) => ({
			wordId: `w${i}`,
			questionType: 'hanzi_to_meaning' as const,
			correct: true,
		})))).toBe(false);
	});

	it('rejects invalid errorType on incorrect answers', () => {
		expect(validatePracticeSubmitItems([
			{ wordId: 'w1', questionType: 'hanzi_to_meaning', correct: false, errorType: 'not_real' },
		])).toBe(false);
	});

	it('validates set terms count and non-empty strings', () => {
		expect(validateSetTerms(['学生', '老师'])).toBe(true);
		expect(validateSetTerms([])).toBe(false);
		expect(validateSetTerms([' '])).toBe(false);
		expect(validateSetTerms(Array.from({ length: 201 }, () => '词'))).toBe(false);
	});

	it('validates import file size and extension', () => {
		const smallCsv = new File(['a'], 'words.csv', { type: 'text/csv' });
		const bigCsv = new File([new Uint8Array(3 * 1024 * 1024)], 'big.csv', { type: 'text/csv' });
		const badExt = new File(['a'], 'words.txt', { type: 'text/plain' });

		expect(validateImportFile(smallCsv)).toBeNull();
		expect(validateImportFile(bigCsv)).toMatch(/quá lớn/i);
		expect(validateImportFile(badExt)).toMatch(/CSV hoặc XLSX/i);
	});
});
