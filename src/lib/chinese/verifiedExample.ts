/* ════════════════════════════════════════════════════════════════════════
   verifiedExample.ts — Example selection for fill_sentence
   ════════════════════════════════════════════════════════════════════════ */
import { enrichExampleForFillWithExisting } from '@/lib/chinese/fillExampleValidator';
import type { CnExampleDTO, CnWordCardDTO } from '@/types/chinese';

export const FILL_EXAMPLE_STATUSES = ['verified', 'auto'] as const;
export type FillExampleStatus = (typeof FILL_EXAMPLE_STATUSES)[number];

function sliceMatchesTarget(example: CnExampleDTO, targetWord: string): boolean {
	if (example.targetWordStart == null || example.targetWordEnd == null) return false;
	return example.hanzi.slice(example.targetWordStart, example.targetWordEnd) === targetWord;
}

export function isFillExample(
	example: CnExampleDTO,
	targetWord: string,
	allowedStatuses: readonly FillExampleStatus[] = FILL_EXAMPLE_STATUSES,
): boolean {
	const status = example.naturalnessStatus ?? 'draft';
	if (!allowedStatuses.includes(status as FillExampleStatus)) return false;
	return sliceMatchesTarget(example, targetWord);
}

/** Strict verified-only check (back-compat) */
export function isVerifiedFillExample(example: CnExampleDTO, targetWord: string): boolean {
	return isFillExample(example, targetWord, ['verified']);
}

/** Derive fill_sentence offsets from hanzi when DB rows are missing metadata. */
export function enrichExampleDtoForFill(
	example: CnExampleDTO,
	targetWord: string,
): CnExampleDTO {
	const meta = enrichExampleForFillWithExisting(example.hanzi, targetWord, {
		naturalnessStatus: example.naturalnessStatus,
		targetWordStart: example.targetWordStart ?? null,
		targetWordEnd: example.targetWordEnd ?? null,
	});
	const meaningViTemplate = example.meaningViTemplate?.includes('__')
		? example.meaningViTemplate
		: example.meaningVi.includes('__')
			? example.meaningVi
			: example.meaningViTemplate;

	return {
		...example,
		meaningViTemplate,
		targetWordStart: meta.targetWordStart,
		targetWordEnd: meta.targetWordEnd,
		naturalnessStatus: meta.naturalnessStatus,
	};
}

export function enrichWordExamplesForFill(word: CnWordCardDTO): CnWordCardDTO {
	if (!word.examples.length) return word;
	return {
		...word,
		examples: word.examples.map((example) => enrichExampleDtoForFill(example, word.simplified)),
	};
}

export function wordSupportsFillSentence(word: CnWordCardDTO): boolean {
	return !!pickFillExample(enrichWordExamplesForFill(word));
}

export function pickFillExample(
	word: CnWordCardDTO,
	allowedStatuses: readonly FillExampleStatus[] = FILL_EXAMPLE_STATUSES,
	rng: () => number = Math.random,
	excludeId?: string,
): CnExampleDTO | null {
	const enriched = enrichWordExamplesForFill(word);
	const allCandidates = enriched.examples.filter((example) =>
		isFillExample(example, enriched.simplified, allowedStatuses),
	);
	const candidates = excludeId
		? allCandidates.filter((example) => example.id !== excludeId)
		: allCandidates;
	const pool = candidates.length ? candidates : allCandidates;
	if (!pool.length) return null;
	return pool[Math.floor(rng() * pool.length)];
}

export function pickVerifiedFillExample(word: CnWordCardDTO): CnExampleDTO | null {
	return pickFillExample(word, ['verified']);
}

export function blankVerifiedExample(example: CnExampleDTO): string | null {
	if (example.targetWordStart == null || example.targetWordEnd == null) return null;
	const before = example.hanzi.slice(0, example.targetWordStart);
	const after = example.hanzi.slice(example.targetWordEnd);
	return `${before}____${after}`;
}

export function blankMeaningViExample(example: CnExampleDTO): string | null {
	if (example.meaningViTemplate?.includes('__')) {
		return example.meaningViTemplate;
	}
	return null;
}
