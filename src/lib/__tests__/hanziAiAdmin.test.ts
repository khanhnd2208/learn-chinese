import { describe, expect, it, vi, beforeEach } from 'vitest';
import { acceptHanziAiCandidate } from '@/services/chinese/hanziAi/hanziAiAdminService';
import { AppError } from '@/lib/appError';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnHanziAiAnalysis: { findUnique: vi.fn(), updateMany: vi.fn() },
		cnHanziAiAnalysisRevision: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		cnHanziAiFactDependency: { deleteMany: vi.fn(), createMany: vi.fn() },
		$transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({
			cnHanziAiAnalysis: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
			cnHanziAiAnalysisRevision: { update: vi.fn(), updateMany: vi.fn() },
			cnHanziAiFactDependency: { deleteMany: vi.fn(), createMany: vi.fn() },
		})),
	},
}));

vi.mock('@/services/chinese/hanziAi/hanziKnownFacts', () => ({
	loadHanziKnownFacts: vi.fn().mockResolvedValue({
		facts: { termLevel: {}, characterLevel: [] },
		dependencies: [],
	}),
	hashKnownFacts: vi.fn().mockReturnValue({ hardFactsHash: 'hash-a', allFactsHash: 'hash-b' }),
}));

import { prisma } from '@/lib/prisma';

const mockAnalysis = {
	id: 'a1',
	contentVersion: 2,
	currentRevisionId: 'rev-current',
	normalizedTerm: '学习',
};

import { validV2Result } from './hanziTrustFixtures';

beforeEach(() => {
	vi.mocked(prisma.cnHanziAiAnalysis.findUnique).mockReset();
	vi.mocked(prisma.cnHanziAiAnalysisRevision.findUnique).mockReset();
});

describe('acceptHanziAiCandidate', () => {
	it('returns 409 when content version is stale', async () => {
		vi.mocked(prisma.cnHanziAiAnalysis.findUnique).mockResolvedValue(mockAnalysis as never);
		vi.mocked(prisma.cnHanziAiAnalysisRevision.findUnique).mockResolvedValue({
			id: 'cand-1', analysisId: 'a1', candidateStatus: 'candidate',
			baseRevisionId: 'rev-current', baseContentVersion: 2,
			hardFactsHash: 'hash-a', schemaVersion: 2, resultJson: validV2Result,
		} as never);

		await expect(acceptHanziAiCandidate('a1', 'cand-1', 'admin', 1)).rejects.toSatisfy(
			(error: unknown) => error instanceof AppError && error.status === 409,
		);
	});

	it('returns 409 when base revision no longer matches', async () => {
		vi.mocked(prisma.cnHanziAiAnalysis.findUnique).mockResolvedValue(mockAnalysis as never);
		vi.mocked(prisma.cnHanziAiAnalysisRevision.findUnique).mockResolvedValue({
			id: 'cand-1', analysisId: 'a1', candidateStatus: 'candidate',
			baseRevisionId: 'old-rev', baseContentVersion: 2,
			hardFactsHash: 'hash-a', schemaVersion: 2, resultJson: validV2Result,
		} as never);

		await expect(acceptHanziAiCandidate('a1', 'cand-1', 'admin', 2)).rejects.toSatisfy(
			(error: unknown) => error instanceof AppError && (error as AppError).code === 'STALE_CANDIDATE',
		);
	});
});
