import { describe, expect, it } from 'vitest';
import { resolveHanziTermIdentity, buildHanziCacheFingerprint } from '@/services/chinese/hanziAi/hanziTermIdentity';
import { computeTrustContentFingerprint, HANZI_TRUST_REGISTRY_VERSION } from '@/services/chinese/hanziAi/hanziTrustRegistry';
import { isTrustResultStale } from '@/services/chinese/hanziAi/hanziTrustPolicy';
import { validV2Result } from './hanziTrustFixtures';

describe('hanziTermIdentity', () => {
	it('preserves distinct canonical terms for 媽媽 vs 妈妈', () => {
		const trad = resolveHanziTermIdentity('媽媽');
		const simp = resolveHanziTermIdentity('妈妈');
		expect(trad.canonicalTerm).toBe('媽媽');
		expect(simp.canonicalTerm).toBe('妈妈');
		expect(trad.canonicalTerm).not.toBe(simp.canonicalTerm);
	});

	it('builds cache fingerprint from version parts', () => {
		const fp = buildHanziCacheFingerprint({
			canonicalTerm: '休息',
			script: 'traditional',
			schemaVersion: 2,
			promptVersion: 'hanzi-v3-trust',
			policyVersion: 'hanzi-trust-v1',
			registryVersion: 1,
			trustContentFingerprint: computeTrustContentFingerprint(),
			hardFactsHash: 'abc123',
		});
		expect(fp).toContain('休息');
		expect(fp).toContain('hanzi-v3-trust');
	});

	it('marks cached v2 stale when registry version drifts', () => {
		const stale = { ...validV2Result, registryVersion: HANZI_TRUST_REGISTRY_VERSION + 1 };
		expect(isTrustResultStale(stale)).toBe(true);
		expect(isTrustResultStale(validV2Result)).toBe(false);
	});
});
