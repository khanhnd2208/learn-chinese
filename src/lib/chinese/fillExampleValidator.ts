/* ════════════════════════════════════════════════════════════════════════
   fillExampleValidator.ts — Auto-validation for fill_sentence examples
   ════════════════════════════════════════════════════════════════════════ */

/** Max Han characters in a fill_sentence example sentence */
export const MAX_FILL_SENTENCE_HAN_LENGTH = 16;

export interface FillTargetOffsets {
	start: number;
	end: number;
}

export interface FillExampleEnrichment {
	naturalnessStatus: 'draft' | 'auto' | 'verified';
	targetWordStart: number | null;
	targetWordEnd: number | null;
}

function hanCharCount(text: string): number {
	return [...text].filter((ch) => /\p{Script=Han}/u.test(ch)).length;
}

/** Target must appear exactly once; sentence length within bound */
export function computeFillTarget(hanzi: string, targetWord: string): FillTargetOffsets | null {
	if (!hanzi.trim() || !targetWord || targetWord.length < 1) return null;
	if (hanCharCount(hanzi) > MAX_FILL_SENTENCE_HAN_LENGTH) return null;

	const start = hanzi.indexOf(targetWord);
	if (start < 0) return null;
	const end = start + targetWord.length;
	if (hanzi.indexOf(targetWord, start + 1) !== -1) return null;

	return { start, end };
}

/** Classify example for persistence — never downgrades verified */
export function enrichExampleForFill(
	hanzi: string,
	targetWord: string,
	existingStatus?: string | null,
): FillExampleEnrichment {
	if (existingStatus === 'verified') {
		return {
			naturalnessStatus: 'verified',
			targetWordStart: null,
			targetWordEnd: null,
		};
	}

	const offsets = computeFillTarget(hanzi, targetWord);
	if (!offsets) {
		return {
			naturalnessStatus: 'draft',
			targetWordStart: null,
			targetWordEnd: null,
		};
	}

	return {
		naturalnessStatus: 'auto',
		targetWordStart: offsets.start,
		targetWordEnd: offsets.end,
	};
}

/** Merge enrichment with existing verified offsets when re-seeding */
export function enrichExampleForFillWithExisting(
	hanzi: string,
	targetWord: string,
	existing?: { naturalnessStatus?: string | null; targetWordStart?: number | null; targetWordEnd?: number | null },
): FillExampleEnrichment {
	if (existing?.naturalnessStatus === 'verified') {
		if (
			existing.targetWordStart != null &&
			existing.targetWordEnd != null &&
			hanzi.slice(existing.targetWordStart, existing.targetWordEnd) === targetWord
		) {
			return {
				naturalnessStatus: 'verified',
				targetWordStart: existing.targetWordStart,
				targetWordEnd: existing.targetWordEnd,
			};
		}
	}
	return enrichExampleForFill(hanzi, targetWord, existing?.naturalnessStatus);
}
