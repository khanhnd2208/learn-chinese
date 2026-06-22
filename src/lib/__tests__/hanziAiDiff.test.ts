import { describe, expect, it } from 'vitest';
import { diffHanziAnalysisResults } from '@/lib/chinese/hanziAiDiff';
import { validV2Result } from './hanziTrustFixtures';

const base = {
	...validV2Result,
	overallExplanationVi: 'Giải thích A',
	overallMnemonicVi: 'Mẹo A',
	characters: [],
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
