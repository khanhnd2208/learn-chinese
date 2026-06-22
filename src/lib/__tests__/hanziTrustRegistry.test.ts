import { describe, expect, it } from 'vitest';
import { containsUnverifiedPhoneticLanguage } from '@/services/chinese/hanziAi/hanziClaimTemplates';
import {
	computeTrustContentFingerprint,
	getCharStructureMeta,
	getDecompositionDepthPolicy,
	isForbiddenClaim,
	lookupCuratedClaim,
	lookupPronunciationInTerm,
} from '@/services/chinese/hanziAi/hanziTrustRegistry';

describe('hanziTrustRegistry', () => {
	it('resolves curated phonetic claim for 清+青', () => {
		const claim = lookupCuratedClaim('清', '青', 'phonetic');
		expect(claim?.phoneticKind).toBe('modern');
	});

	it('休 is associative_compound without phonetic', () => {
		const meta = getCharStructureMeta('休');
		expect(meta?.structureKind).toBe('associative_compound');
		expect(meta?.phoneticAllowed).toBe(false);
	});

	it('forbids 侵 semantic claim on 寢 but not globally', () => {
		expect(isForbiddenClaim('寢', '侵', 'semantic')?.reason).toContain('ngủ');
		expect(isForbiddenClaim('憂', '侵', 'semantic')).toBeUndefined();
	});

	it('鬱 uses visual_shallow not hidden policy', () => {
		expect(getDecompositionDepthPolicy('鬱')).toBe('visual_shallow');
		expect(getDecompositionDepthPolicy('寢')).toBe('verified_only');
	});

	it('pronunciation in term for 休息/息', () => {
		const entry = lookupPronunciationInTerm('息', '休息');
		expect(entry?.pinyinInTerm).toBe('xi');
	});

	it('fingerprint is stable hash', () => {
		expect(computeTrustContentFingerprint()).toHaveLength(64);
	});

	it('does not flag mnemonic arrow as phonetic language', () => {
		expect(containsUnverifiedPhoneticLanguage('亻 + 木 → người dựa cây nghỉ')).toBe(false);
		expect(containsUnverifiedPhoneticLanguage('gợi âm từ mù')).toBe(true);
	});
});
