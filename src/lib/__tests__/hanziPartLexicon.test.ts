import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildHanziPartLexicon } from '@/services/chinese/hanziAi/hanziPartLexicon';
import type { HanziAnalysisResult } from '@/services/chinese/hanziAi/hanziAnalysisSchema';
import {
	HANZI_TRUST_POLICY_VERSION,
	HANZI_TRUST_REGISTRY_VERSION,
} from '@/services/chinese/hanziAi/hanziTrustRegistry';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnHanzi: {
			findMany: vi.fn(),
		},
	},
}));

import { prisma } from '@/lib/prisma';

const mockFindMany = vi.mocked(prisma.cnHanzi.findMany);

function sampleAnalysis(): HanziAnalysisResult {
	return {
		schemaVersion: 2,
		policyVersion: HANZI_TRUST_POLICY_VERSION,
		registryVersion: HANZI_TRUST_REGISTRY_VERSION,
		requestedTerm: '折',
		displayTerm: '折',
		canonicalTerm: '折',
		term: '折',
		normalizedTerm: '折',
		script: 'simplified',
		simplified: '折',
		traditional: null,
		pinyin: 'zhé',
		hanViet: 'CHIẾT',
		primaryMeaningVi: 'bẻ gãy',
		otherMeaningsVi: [],
		wordClasses: [],
		usageNoteVi: null,
		overallExplanationVi: 'Giải thích',
		overallMnemonicVi: null,
		lexicalStatus: 'ready',
		decompositionStatus: 'full',
		exampleStatus: 'ready',
		characters: [{
			position: 0,
			char: '折',
			pinyin: 'zhé',
			dictionaryReadings: ['zhé'],
			hanViet: 'CHIẾT',
			meaningVi: 'bẻ gãy',
			radical: {
				char: '扌',
				nameVi: 'thủ',
				meaningVi: 'tay',
				standardChar: '手',
				variantNoteVi: null,
			},
			structureType: 'left_right',
			decompositionDisplayMode: 'full',
			components: [
				{
					char: '扌',
					position: 0,
					relation: 'semantic',
					role: 'radical',
					phoneticKind: null,
					claimTrust: 'curated',
					publishExplanationVi: 'Bên trái là bộ thủ tay.',
					meaningVi: 'tay',
					explanationVi: 'Bên trái là bộ thủ tay.',
					isMainRadical: true,
				},
				{
					char: '斤',
					position: 1,
					relation: 'visual',
					role: 'form',
					phoneticKind: null,
					claimTrust: 'curated',
					publishExplanationVi: 'Bên phải là chữ 斤.',
					meaningVi: 'rìu',
					explanationVi: 'Bên phải là chữ 斤.',
					isMainRadical: false,
				},
			],
			structureExplanationVi: 'Ghép trái — phải.',
			mnemonicVi: null,
			etymologyNoteVi: null,
			etymologyStatus: 'not_provided',
			similarCharacters: [],
		}],
		examples: [],
		warnings: [],
	};
}

beforeEach(() => {
	mockFindMany.mockReset();
});

describe('buildHanziPartLexicon', () => {
	it('resolves 斤 from database and 扌 via standardChar 手', async () => {
		mockFindMany.mockResolvedValue([
			{ char: '斤', pinyin: 'jīn', hanViet: 'CÂN', meaningVi: 'rìu, cân' },
			{ char: '手', pinyin: 'shǒu', hanViet: 'THỦ', meaningVi: 'tay' },
		] as never);

		const lexicon = await buildHanziPartLexicon(sampleAnalysis());

		expect(lexicon['斤']).toEqual({
			pinyin: 'jīn',
			hanViet: 'CÂN',
			meaningVi: 'rìu, cân',
			source: 'database',
		});
		expect(lexicon['扌']).toMatchObject({
			pinyin: 'shǒu',
			hanViet: 'thủ',
			meaningVi: 'tay',
		});
		expect(mockFindMany).toHaveBeenCalledWith({
			where: { char: { in: expect.arrayContaining(['扌', '手', '斤']) }, status: 'published' },
			select: { char: true, pinyin: true, hanViet: true, meaningVi: true },
		});
	});

	it('falls back to radical meta when database misses', async () => {
		mockFindMany.mockResolvedValue([] as never);

		const lexicon = await buildHanziPartLexicon(sampleAnalysis());

		expect(lexicon['扌']).toMatchObject({
			hanViet: 'thủ',
			meaningVi: 'tay',
			source: 'radical_meta',
		});
		expect(lexicon['斤']).toMatchObject({
			meaningVi: 'rìu',
			source: 'ai_hint',
		});
	});
});
