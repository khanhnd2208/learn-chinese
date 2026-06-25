import { describe, it, expect } from 'vitest';
import {
	parseFillExampleCell,
	normalizeFillBlankToken,
	MIN_FILL_EXAMPLES_PER_WORD,
} from '@/lib/chinese/parseFillExample';

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

	it('parses [BLANK] token in place of __', () => {
		const result = parseFillExampleCell(
			'他是[BLANK]。|tā shì [BLANK].|Anh ấy là [BLANK].',
			'老师',
			'giáo viên',
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.example.hanzi).toBe('他是老师。');
		expect(result.example.meaningViTemplate).toBe('Anh ấy là __.');
	});

	it('strips markdown bold markers from blanks', () => {
		const result = parseFillExampleCell(
			'他是**__**。|tā shì __.|Anh ấy là __.',
			'老师',
			'giáo viên',
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.example.hanzi).toBe('他是老师。');
	});

	it('auto-repairs when target word present but blank missing (Pattern A)', () => {
		const result = parseFillExampleCell(
			'他是老师。|tā shì lǎoshī.|Anh ấy là __.',
			'老师',
			'giáo viên',
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.example.hanzi).toBe('他是老师。');
		expect(result.example.repaired).toBe(true);
	});

	it('rejects when target word appears outside blank with actionable reason', () => {
		const result = parseFillExampleCell(
			'老师是__。|lǎoshī shì __.|Thầy là __.',
			'老师',
			'giáo viên',
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toContain('老师');
		expect(result.reason).toContain('không viết cả từ lẫn [BLANK]');
	});

	it('rejects duplicate target in sentence (吗: 你好吗[BLANK]？)', () => {
		const result = parseFillExampleCell(
			'你好吗[BLANK]？|nǐ hǎo [BLANK]?|Bạn khỏe [BLANK]?',
			'吗',
			'không; à',
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toContain('吗');
		expect(result.reason).toContain('không viết cả từ lẫn [BLANK]');
	});

	it('requires exactly one blank in Chinese and Vietnamese', () => {
		expect(parseFillExampleCell('他是老师。|tā shì.|Anh là.', '老师', 'giáo viên').ok).toBe(false);
		expect(parseFillExampleCell('他是__ __。|tā shì.|Anh __ __.', '老师', 'giáo viên').ok).toBe(false);
	});

	it('reports actionable reason when blank fully missing (Pattern B)', () => {
		const result = parseFillExampleCell(
			'他是。|tā shì.|Anh ấy là __.',
			'老师',
			'giáo viên',
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toContain('Markdown');
	});

	it('MIN_FILL_EXAMPLES_PER_WORD is 5', () => {
		expect(MIN_FILL_EXAMPLES_PER_WORD).toBe(5);
	});
});

describe('normalizeFillBlankToken', () => {
	it('normalizes [BLANK] case-insensitively', () => {
		expect(normalizeFillBlankToken('[blank]')).toBe('__');
		expect(normalizeFillBlankToken('[BLANK]')).toBe('__');
	});
});
