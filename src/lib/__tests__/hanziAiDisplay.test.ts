import { describe, expect, it } from 'vitest';
import { formatHanziComponentRole, formatHanziStructureType } from '@/lib/chinese/hanziAiDisplay';

describe('hanziAiDisplay', () => {
	it('maps component roles to Vietnamese labels', () => {
		expect(formatHanziComponentRole('semantic').label).toBe('Gợi ý nghĩa');
		expect(formatHanziComponentRole('phonetic').label).toBe('Gợi ý cách đọc');
		expect(formatHanziComponentRole('unknown').label).toBe('Chưa rõ vai trò');
	});

	it('maps structure types to Vietnamese labels', () => {
		expect(formatHanziStructureType('top_bottom')).toBe('Ghép trên — dưới');
		expect(formatHanziStructureType('left_right')).toBe('Ghép trái — phải');
	});
});
