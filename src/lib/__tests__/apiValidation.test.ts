import { describe, it, expect } from 'vitest';
import {
	CN_MAX_BULK_ITEM_IDS,
	CN_MAX_EXCLUDE_IDS,
	CN_MAX_SMART_IMPORT_TEXT_CHARS,
	parseBoundedIntParam,
	parseDelimitedListParam,
	validateBulkItemIds,
	validateJsonContentLength,
	validatePracticeSubmitItems,
	validateSetTerms,
	validateImportFile,
	validateSmartImportText,
} from '@/lib/apiValidation';

describe('apiValidation', () => {
	it('accepts valid practice submit items', () => {
		expect(validatePracticeSubmitItems([
			{ wordId: 'w1', questionType: 'hanzi_to_meaning', correct: true },
			{ wordId: 'w2', questionType: 'meaning_to_hanzi_typed', correct: false, errorType: 'quen_hanzi' },
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

	it('parses bounded integer query params', () => {
		expect(parseBoundedIntParam(null, { defaultValue: 5, min: 1, max: 20 })).toBe(5);
		expect(parseBoundedIntParam('10', { defaultValue: 5, min: 1, max: 20 })).toBe(10);
		expect(parseBoundedIntParam('0', { defaultValue: 5, min: 1, max: 20 })).toBeNull();
		expect(parseBoundedIntParam('21', { defaultValue: 5, min: 1, max: 20 })).toBeNull();
		expect(parseBoundedIntParam('1.5', { defaultValue: 5, min: 1, max: 20 })).toBeNull();
	});

	it('bounds delimited query lists', () => {
		expect(parseDelimitedListParam('a,b, c')).toEqual(['a', 'b', 'c']);
		expect(parseDelimitedListParam(null)).toEqual([]);
		expect(parseDelimitedListParam(Array.from({ length: CN_MAX_EXCLUDE_IDS + 1 }, (_, i) => `x${i}`).join(','))).toBeNull();
		expect(parseDelimitedListParam('x'.repeat(121))).toBeNull();
	});

	it('validates bulk item ids', () => {
		expect(validateBulkItemIds(['a', 'b'])).toBe(true);
		expect(validateBulkItemIds([])).toBe(false);
		expect(validateBulkItemIds([''])).toBe(false);
		expect(validateBulkItemIds(Array.from({ length: CN_MAX_BULK_ITEM_IDS + 1 }, (_, i) => `id-${i}`))).toBe(false);
	});

	it('validates JSON request size and smart import text length', () => {
		expect(validateJsonContentLength(new Headers({ 'content-length': '1024' }))).toBeNull();
		expect(validateJsonContentLength(new Headers({ 'content-length': String(300 * 1024) }))).toMatch(/JSON body quá lớn/);
		expect(validateSmartImportText('你好\tni hao')).toBeNull();
		expect(validateSmartImportText('x'.repeat(CN_MAX_SMART_IMPORT_TEXT_CHARS + 1))).toMatch(/Dữ liệu quá dài/);
	});
});
