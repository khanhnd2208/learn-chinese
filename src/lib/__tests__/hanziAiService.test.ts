import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getCachedHanziAiAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisService';
import { validV2Result } from './hanziTrustFixtures';
import { HANZI_TRUST_PROMPT_VERSION } from '@/services/chinese/hanziAi/hanziTrustRegistry';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnHanziAiAnalysis: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
	},
}));

vi.mock('@/services/chinese/hanziAi/hanziKnownFacts', () => ({
	loadHanziKnownFacts: vi.fn().mockResolvedValue({
		facts: { termLevel: {}, characterLevel: [] },
		dependencies: [],
	}),
	hashKnownFacts: vi.fn().mockReturnValue({ hardFactsHash: 'live-hard', allFactsHash: 'live-all' }),
}));

import { prisma } from '@/lib/prisma';
import { hashKnownFacts } from '@/services/chinese/hanziAi/hanziKnownFacts';

beforeEach(() => {
	vi.mocked(prisma.cnHanziAiAnalysis.findUnique).mockReset();
	vi.mocked(prisma.cnHanziAiAnalysis.update).mockReset();
	vi.mocked(prisma.cnHanziAiAnalysis.updateMany).mockReset();
	vi.mocked(hashKnownFacts).mockReturnValue({ hardFactsHash: 'live-hard', allFactsHash: 'live-all' });
});

describe('getCachedHanziAiAnalysis', () => {
	it('does not write to database on cache read', async () => {
		vi.mocked(prisma.cnHanziAiAnalysis.findUnique).mockResolvedValue({
			id: 'a1', normalizedTerm: '学习', contentStatus: 'ready', contentVersion: 1,
			openReportCount: 0, hardFactsHash: 'live-hard', allFactsHash: 'live-all',
			generationLeaseToken: null, generationLeaseAt: null,
			currentRevision: { resultJson: validV2Result, schemaVersion: 2, promptVersion: HANZI_TRUST_PROMPT_VERSION },
		} as never);

		const result = await getCachedHanziAiAnalysis('学习');
		expect(result?.status).toBe('ready');
		expect(prisma.cnHanziAiAnalysis.update).not.toHaveBeenCalled();
		expect(prisma.cnHanziAiAnalysis.updateMany).not.toHaveBeenCalled();
	});

	it('returns stale when hard facts hash drifted without mutating DB', async () => {
		vi.mocked(hashKnownFacts).mockReturnValue({ hardFactsHash: 'new-hard', allFactsHash: 'live-all' });
		vi.mocked(prisma.cnHanziAiAnalysis.findUnique).mockResolvedValue({
			id: 'a1', normalizedTerm: '学习', contentStatus: 'ready', contentVersion: 1,
			openReportCount: 0, hardFactsHash: 'live-hard', allFactsHash: 'live-all',
			generationLeaseToken: null, generationLeaseAt: null,
			currentRevision: { resultJson: validV2Result, schemaVersion: 2, promptVersion: HANZI_TRUST_PROMPT_VERSION },
		} as never);

		const result = await getCachedHanziAiAnalysis('学习');
		expect(result?.status).toBe('stale');
		expect(result?.analysis).toBeNull();
		expect(prisma.cnHanziAiAnalysis.update).not.toHaveBeenCalled();
	});

	it('returns ready with factsSoftStale when only all-facts hash drifted', async () => {
		vi.mocked(hashKnownFacts).mockReturnValue({ hardFactsHash: 'live-hard', allFactsHash: 'new-all' });
		vi.mocked(prisma.cnHanziAiAnalysis.findUnique).mockResolvedValue({
			id: 'a1', normalizedTerm: '学习', contentStatus: 'ready', contentVersion: 1,
			openReportCount: 0, hardFactsHash: 'live-hard', allFactsHash: 'live-all',
			generationLeaseToken: null, generationLeaseAt: null,
			currentRevision: { resultJson: validV2Result, schemaVersion: 2, promptVersion: HANZI_TRUST_PROMPT_VERSION },
		} as never);

		const result = await getCachedHanziAiAnalysis('学习');
		expect(result?.status).toBe('ready');
		expect(result?.factsSoftStale).toBe(true);
	});
});
