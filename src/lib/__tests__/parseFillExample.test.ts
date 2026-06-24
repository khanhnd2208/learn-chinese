import { describe, it, expect } from 'vitest';
import { parseFillExampleCell, MIN_FILL_EXAMPLES_PER_WORD } from '@/lib/chinese/parseFillExample';

describe('parseFillExampleCell', () => {
	it('parses valid vi_du cell with Chinese and Vietnamese blanks', () => {
		const result = parseFillExampleCell(
			'他是__。|tā shì __.|Anh ấy là __.',
			'老师',
			'giáo viên',
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.example.hanzi).toBe('他是老师。');
		expect(result.example.targetWordStart).toBe(2);
		expect(result.example.targetWordEnd).toBe(4);
		expect(result.example.meaningViTemplate).toBe('Anh ấy là __.');
		expect(result.example.meaningVi).toBe('Anh ấy là giáo viên.');
	});

	it('rejects when target word appears outside blank', () => {
		const result = parseFillExampleCell(
			'老师是__。|lǎoshī shì __.|Thầy là __.',
			'老师',
			'giáo viên',
		);
		expect(result.ok).toBe(false);
	});

	it('requires exactly one blank in Chinese and Vietnamese', () => {
		expect(parseFillExampleCell('他是老师。|tā shì.|Anh là.', '老师', 'giáo viên').ok).toBe(false);
		expect(parseFillExampleCell('他是__ __。|tā shì.|Anh __ __.', '老师', 'giáo viên').ok).toBe(false);
	});

	it('MIN_FILL_EXAMPLES_PER_WORD is 5', () => {
		expect(MIN_FILL_EXAMPLES_PER_WORD).toBe(5);
	});
});
