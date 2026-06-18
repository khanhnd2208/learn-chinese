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

const validResult = {
	schemaVersion: 1,
	term: '学习', normalizedTerm: '学习', script: 'simplified',
	simplified: '学习', traditional: '學習', pinyin: 'xuéxí', hanViet: 'HỌC TẬP',
	primaryMeaningVi: 'học tập', otherMeaningsVi: [], wordClasses: [], usageNoteVi: null,
	overallExplanationVi: 'x', overallMnemonicVi: null,
	characters: [{ position: 0, char: '学', pinyin: 'xué', dictionaryReadings: ['xué'], hanViet: 'HỌC', meaningVi: 'học', radical: null, structureType: 'single', components: [], structureExplanationVi: 'x', mnemonicVi: null, etymologyStatus: 'not_provided', similarCharacters: [] }, { position: 1, char: '习', pinyin: 'xí', dictionaryReadings: ['xí'], hanViet: 'TẬP', meaningVi: 'tập', radical: null, structureType: 'single', components: [], structureExplanationVi: 'x', mnemonicVi: null, etymologyStatus: 'not_provided', similarCharacters: [] }],
	examples: [{ chinese: '我每天学习中文。', pinyin: 'Wǒ měitiān xuéxí Zhōngwén.', meaningVi: 'Tôi học tiếng Trung mỗi ngày.', usageNoteVi: null }],
	warnings: [],
};

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
			hardFactsHash: 'hash-a', schemaVersion: 1, resultJson: validResult,
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
			hardFactsHash: 'hash-a', schemaVersion: 1, resultJson: validResult,
		} as never);

		await expect(acceptHanziAiCandidate('a1', 'cand-1', 'admin', 2)).rejects.toSatisfy(
			(error: unknown) => error instanceof AppError && (error as AppError).code === 'STALE_CANDIDATE',
		);
	});
});
