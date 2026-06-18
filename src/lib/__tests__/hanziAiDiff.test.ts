import { describe, expect, it } from 'vitest';
import { diffHanziAnalysisResults } from '@/lib/chinese/hanziAiDiff';

const base = {
	schemaVersion: 1 as const,
	term: '学习', normalizedTerm: '学习', script: 'simplified' as const,
	simplified: '学习', traditional: '學習', pinyin: 'xuéxí', hanViet: 'HỌC TẬP',
	primaryMeaningVi: 'học tập', otherMeaningsVi: [], wordClasses: [], usageNoteVi: null,
	overallExplanationVi: 'Giải thích A', overallMnemonicVi: 'Mẹo A',
	characters: [],
	examples: [{ chinese: '我每天学习中文。', pinyin: 'x', meaningVi: 'y', usageNoteVi: null }],
	warnings: [],
};

describe('diffHanziAnalysisResults', () => {
	it('detects changed pinyin and meaning', () => {
		const candidate = { ...base, pinyin: 'xué xí', primaryMeaningVi: 'học' };
		const diffs = diffHanziAnalysisResults(base, candidate);
		expect(diffs.some((d) => d.field === 'Pinyin')).toBe(true);
		expect(diffs.some((d) => d.field === 'Nghĩa chính')).toBe(true);
	});

	it('returns empty when results match on tracked fields', () => {
		expect(diffHanziAnalysisResults(base, { ...base })).toEqual([]);
	});
});
