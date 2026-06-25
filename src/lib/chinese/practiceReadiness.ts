/* ════════════════════════════════════════════════════════════════════════
   practiceReadiness.ts — Assess word data readiness for practice modes
   ════════════════════════════════════════════════════════════════════════ */
import { enrichWordExamplesForFill, wordSupportsFillSentence } from '@/lib/chinese/verifiedExample';
import type { CnWordCardDTO } from '@/types/chinese';

export interface PracticeReadiness {
	hasExample: boolean;
	supportsSentence: boolean;
}

export function assessWordCardReadiness(word: CnWordCardDTO): PracticeReadiness {
	const enriched = enrichWordExamplesForFill(word);
	return {
		hasExample: enriched.examples.some((example) => !!example.hanzi),
		supportsSentence: wordSupportsFillSentence(enriched),
	};
}

export function assessLookupReadiness(input: {
	simplified: string;
	meaningVi: string;
	pinyin: string;
	examples?: Array<{
		hanzi: string;
		targetWordStart?: number | null;
		targetWordEnd?: number | null;
		naturalnessStatus?: string;
	}>;
}): PracticeReadiness {
	const card: CnWordCardDTO = {
		id: 'assess',
		simplified: input.simplified,
		pinyin: input.pinyin,
		hanViet: '',
		meaningVi: input.meaningVi,
		partOfSpeech: '',
		mnemonicVi: '',
		hskLevel: null,
		status: 'published',
		examples: (input.examples ?? []).map((e, i) => ({
			id: `e-${i}`,
			hanzi: e.hanzi,
			pinyin: '',
			meaningVi: '',
			targetWordStart: e.targetWordStart,
			targetWordEnd: e.targetWordEnd,
			naturalnessStatus: e.naturalnessStatus,
		})),
		patterns: [],
		chars: [],
		relatedWords: [],
	};
	return assessWordCardReadiness(card);
}
