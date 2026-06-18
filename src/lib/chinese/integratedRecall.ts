/* ════════════════════════════════════════════════════════════════════════
   integratedRecall.ts — Multi-step integrated recall per word
   ════════════════════════════════════════════════════════════════════════ */
import {
	buildMcqOptions,
	mergeWordPools,
	MIN_MCQ_OPTIONS,
	pickExample,
} from '@/lib/chinese/generateQuestions';
import type { CnPracticeQuestionDTO, CnWordCardDTO, CnWordProgressDTO } from '@/types/chinese';

export interface IntegratedWordBundle {
	wordId: string;
	steps: CnPracticeQuestionDTO[];
}

export function wordEligibleForIntegrated(word: CnWordCardDTO): boolean {
	if (!word.pinyin || !word.meaningVi || !word.examples.length) return false;
	return true;
}

export function buildIntegratedBundles(
	words: CnWordCardDTO[],
	count: number,
	progressMap: Map<string, CnWordProgressDTO | null>,
	distractorPool?: CnWordCardDTO[],
): IntegratedWordBundle[] {
	const pool = mergeWordPools(words, distractorPool);
	const poolMeaning = [...new Set(pool.map((w) => w.meaningVi).filter(Boolean))];
	const eligible = words.filter((w) => wordEligibleForIntegrated(w));
	const shuffled = [...eligible].sort(() => Math.random() - 0.5).slice(0, count);
	const bundles: IntegratedWordBundle[] = [];

	for (const word of shuffled) {
		const example = pickExample(word);
		if (!example) continue;

		const meaningOptions = buildMcqOptions(word.meaningVi, poolMeaning);
		const listenOptions = buildMcqOptions(word.meaningVi, poolMeaning);
		if (!meaningOptions || meaningOptions.length < MIN_MCQ_OPTIONS) continue;
		if (!listenOptions || listenOptions.length < MIN_MCQ_OPTIONS) continue;

		const listenStep: CnPracticeQuestionDTO = {
			id: `${word.id}-integrated-listen`,
			wordId: word.id,
			type: 'audio_to_meaning',
			prompt: 'Bước 1/3: Nghe câu ví dụ và chọn nghĩa từ đích',
			audioText: example.hanzi,
			correctAnswer: word.meaningVi,
			options: listenOptions,
		};

		const pinyinStep: CnPracticeQuestionDTO = {
			id: `${word.id}-integrated-pinyin`,
			wordId: word.id,
			type: 'audio_to_pinyin_typed',
			prompt: `Bước 2/3: Nghe và gõ pinyin của từ "${word.meaningVi}"`,
			audioText: word.simplified,
			correctAnswer: word.pinyin,
		};

		const meaningStep: CnPracticeQuestionDTO = {
			id: `${word.id}-integrated-meaning`,
			wordId: word.id,
			type: 'hanzi_to_meaning',
			prompt: `Bước 3/3: Chọn nghĩa của ${word.simplified}`,
			hanzi: word.simplified,
			pinyin: word.pinyin,
			options: meaningOptions,
			correctAnswer: word.meaningVi,
		};

		bundles.push({
			wordId: word.id,
			steps: [listenStep, pinyinStep, meaningStep],
		});
	}

	return bundles;
}

export function flattenIntegratedBundles(bundles: IntegratedWordBundle[]): CnPracticeQuestionDTO[] {
	return bundles.flatMap((b) => b.steps);
}
