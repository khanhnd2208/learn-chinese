/* ════════════════════════════════════════════════════════════════════════
   practiceReadiness.ts — Assess word data readiness for practice modes
   ════════════════════════════════════════════════════════════════════════ */
import { wordSupportsQuestionType } from '@/lib/chinese/practiceTaxonomy';
import type { CnQuestionType, CnWordCardDTO } from '@/types/chinese';

const SENTENCE_TYPES: CnQuestionType[] = ['fill_sentence', 'sentence_order', 'translate_sentence'];
const HANZI_TYPES: CnQuestionType[] = ['radical_pick', 'char_components', 'similar_char'];

export interface PracticeReadiness {
	hasExample: boolean;
	hasPattern: boolean;
	supportsSentence: boolean;
	supportsHanziMemory: boolean;
	supportsSimilarChar: boolean;
}

export function assessWordCardReadiness(word: CnWordCardDTO): PracticeReadiness {
	const hasExample = word.examples.length > 0 && !!word.examples[0]?.hanzi;
	const hasPattern = word.patterns.some((p) => p.samples?.some((s) => s.meaningVi && s.hanzi));
	return {
		hasExample,
		hasPattern,
		supportsSentence: SENTENCE_TYPES.some((t) => wordSupportsQuestionType(word, t)),
		supportsHanziMemory: HANZI_TYPES.some((t) => wordSupportsQuestionType(word, t)),
		supportsSimilarChar: wordSupportsQuestionType(word, 'similar_char'),
	};
}

export function assessLookupReadiness(input: {
	simplified: string;
	meaningVi: string;
	pinyin: string;
	exampleHanzi?: string | null;
	patternSamples?: Array<{ hanzi: string; pinyin?: string; meaningVi: string }>;
	chars: Array<{ radical: string; components: string[]; similarGroupId: string | null }>;
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
		examples: input.exampleHanzi
			? [{ id: 'e', hanzi: input.exampleHanzi, pinyin: '', meaningVi: '' }]
			: [],
		patterns: input.patternSamples?.length
			? [{ id: 'p', template: '', samples: input.patternSamples.map((s) => ({ hanzi: s.hanzi, pinyin: s.pinyin ?? '', meaningVi: s.meaningVi })) }]
			: [],
		chars: input.chars.map((c, i) => ({
			id: `c${i}`,
			char: '',
			pinyin: '',
			hanViet: '',
			meaningVi: '',
			components: c.components,
			radical: c.radical,
			mnemonicVi: '',
			similarGroupId: c.similarGroupId,
			status: 'published' as const,
			position: i,
		})),
		relatedWords: [],
	};
	return assessWordCardReadiness(card);
}
