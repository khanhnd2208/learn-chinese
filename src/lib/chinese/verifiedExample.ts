/* ════════════════════════════════════════════════════════════════════════
   verifiedExample.ts — Example selection for fill_sentence
   ════════════════════════════════════════════════════════════════════════ */
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

export function pickFillExample(
	word: CnWordCardDTO,
	allowedStatuses: readonly FillExampleStatus[] = FILL_EXAMPLE_STATUSES,
	rng: () => number = Math.random,
	excludeId?: string,
): CnExampleDTO | null {
	const allCandidates = word.examples.filter((example) =>
		isFillExample(example, word.simplified, allowedStatuses),
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
