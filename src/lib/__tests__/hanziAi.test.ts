import { describe, expect, it } from 'vitest';
import { normalizeHanziAiTerm, isValidHanziAiTerm, containsUnsafeAiText } from '@/services/chinese/hanziAi/hanziNormalization';
import { hanziAnalysisResultSchema } from '@/services/chinese/hanziAi/hanziAnalysisSchema';
import { validateHanziAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisValidator';
import { hashKnownFacts } from '@/services/chinese/hanziAi/hanziKnownFacts';
import type { HanziKnownFacts } from '@/services/chinese/hanziAi/hanziAiTypes';

const result = {
	schemaVersion: 1 as const,
	term: '学习', normalizedTerm: '学习', script: 'simplified' as const,
	simplified: '学习', traditional: '學習', pinyin: 'xuéxí', hanViet: 'HỌC TẬP',
	primaryMeaningVi: 'học tập', otherMeaningsVi: [], wordClasses: ['động từ'], usageNoteVi: null,
	overallExplanationVi: 'Hoạt động tiếp thu và luyện tập kiến thức.', overallMnemonicVi: 'Học rồi luyện tập.',
	characters: [
		{
			position: 0, char: '学', pinyin: 'xué', dictionaryReadings: ['xué'], hanViet: 'HỌC', meaningVi: 'học',
			radical: { char: '子', nameVi: 'tử', meaningVi: 'con' }, structureType: 'top_bottom' as const,
			components: [{ char: '⺍', position: 0, role: 'form' as const, meaningVi: null, explanationVi: 'Phần trên.', isMainRadical: false }, { char: '子', position: 1, role: 'radical' as const, meaningVi: 'con', explanationVi: 'Bộ chính.', isMainRadical: true }],
			structureExplanationVi: 'Cấu tạo trên dưới.', mnemonicVi: null, etymologyStatus: 'not_provided' as const, similarCharacters: [],
		},
		{
			position: 1, char: '习', pinyin: 'xí', dictionaryReadings: ['xí'], hanViet: 'TẬP', meaningVi: 'luyện tập',
			radical: null, structureType: 'single' as const, components: [],
			structureExplanationVi: 'Chữ đơn giản.', mnemonicVi: null, etymologyStatus: 'not_provided' as const, similarCharacters: [],
		},
	],
	examples: [{ chinese: '我每天学习中文。', pinyin: 'Wǒ měitiān xuéxí Zhōngwén.', meaningVi: 'Tôi học tiếng Trung mỗi ngày.', usageNoteVi: null }],
	warnings: [],
};

const facts: HanziKnownFacts = {
	termLevel: {
		pinyinInContext: { value: 'xuéxí', trust: 'expert_verified' },
		meaningVi: { value: 'học tập', trust: 'expert_verified' },
	},
	characterLevel: [
		{ char: '学', position: 0, components: { value: ['⺍', '子'], trust: 'expert_verified' } },
		{ char: '习', position: 1 },
	],
};

describe('Hanzi AI normalization and validation', () => {
	it('normalizes and accepts one to four Han characters only', () => {
		expect(normalizeHanziAiTerm('  學習  ')).toBe('學習');
		expect(isValidHanziAiTerm('学习')).toBe(true);
		expect(isValidHanziAiTerm('學習')).toBe(true);
		expect(isValidHanziAiTerm('学习中文很好')).toBe(false);
		expect(isValidHanziAiTerm('学 习')).toBe(false);
		expect(isValidHanziAiTerm('学习123')).toBe(false);
	});

	it('accepts a complete result and enforces exact examples', () => {
		expect(hanziAnalysisResultSchema.safeParse(result).success).toBe(true);
		expect(validateHanziAnalysis(result, '学习', facts).errors).toEqual([]);
		const invalid = { ...result, examples: [{ ...result.examples[0], chinese: '我每天读书。' }] };
		expect(validateHanziAnalysis(invalid, '学习', facts).errors.join(' ')).toContain('phải chứa đúng');
	});

	it('rejects hard-fact conflicts and unsafe output', () => {
		const conflict = { ...result, pinyin: 'xué xí' };
		expect(validateHanziAnalysis(conflict, '学习', facts).category).toBe('curated_conflict');
		expect(containsUnsafeAiText('[xem](https://example.com)')).toBe(true);
	});

	it('preserves component order in hashes but treats dictionary readings as a set', () => {
		const reversed: HanziKnownFacts = structuredClone(facts);
		reversed.characterLevel[0].components = { value: ['子', '⺍'], trust: 'expert_verified' };
		expect(hashKnownFacts(reversed).hardFactsHash).not.toBe(hashKnownFacts(facts).hardFactsHash);

		const readingsA: HanziKnownFacts = { termLevel: {}, characterLevel: [{ char: '行', position: 0, dictionaryReadings: { value: ['xíng', 'háng'], trust: 'expert_verified' } }] };
		const readingsB: HanziKnownFacts = { termLevel: {}, characterLevel: [{ char: '行', position: 0, dictionaryReadings: { value: ['háng', 'xíng'], trust: 'expert_verified' } }] };
		expect(hashKnownFacts(readingsA).hardFactsHash).toBe(hashKnownFacts(readingsB).hardFactsHash);
	});
});

