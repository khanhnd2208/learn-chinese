/* ════════════════════════════════════════════════════════════════════════
   practiceReadiness.ts — Assess word data readiness for practice modes
   ════════════════════════════════════════════════════════════════════════ */
import { wordSupportsQuestionType } from '@/lib/chinese/practiceTaxonomy';
import type { CnWordCardDTO } from '@/types/chinese';

export interface PracticeReadiness {
	hasExample: boolean;
	supportsSentence: boolean;
}

export function assessWordCardReadiness(word: CnWordCardDTO): PracticeReadiness {
	return {
		hasExample: word.examples.length > 0 && !!word.examples[0]?.hanzi,
		supportsSentence: wordSupportsQuestionType(word, 'fill_sentence'),
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
