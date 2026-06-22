import { describe, expect, it } from 'vitest';
import { formatHanziComponentRole, formatHanziStructureType, resolvePartDisplay } from '@/lib/chinese/hanziAiDisplay';

describe('hanziAiDisplay', () => {
	it('maps component roles to Vietnamese labels', () => {
		expect(formatHanziComponentRole('semantic').label).toBe('Gợi ý nghĩa');
		expect(formatHanziComponentRole('phonetic').label).toBe('Gợi âm (đã kiểm chứng)');
		expect(formatHanziComponentRole('form').label).toBe('Thành phần nhìn thấy');
		expect(formatHanziComponentRole('unknown').label).toBe('Chưa rõ vai trò');
	});

	it('maps structure types to Vietnamese labels', () => {
		expect(formatHanziStructureType('top_bottom')).toBe('Ghép trên — dưới');
		expect(formatHanziStructureType('left_right')).toBe('Ghép trái — phải');
	});

	it('resolves part display with lexicon and fallbacks', () => {
		const fromDb = resolvePartDisplay('斤', {
			pinyin: 'jīn',
			hanViet: 'CÂN',
			meaningVi: 'rìu',
			source: 'database',
		});
		expect(fromDb).toEqual({
			char: '斤',
			pinyin: 'jīn',
			hanViet: 'CÂN',
			meaningVi: 'rìu',
			incomplete: false,
		});

		const fallback = resolvePartDisplay('扌', undefined, { hanViet: 'thủ', meaningVi: 'tay' });
		expect(fallback.hanViet).toBe('THỦ');
		expect(fallback.meaningVi).toBe('tay');
		expect(fallback.incomplete).toBe(true);
	});
});
