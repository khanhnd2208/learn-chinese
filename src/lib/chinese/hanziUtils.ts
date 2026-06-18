/* ════════════════════════════════════════════════════════════════════════
   hanziUtils.ts — Chinese character helpers
   ════════════════════════════════════════════════════════════════════════ */

const HANZI_RE = /^[\u4e00-\u9fff]+$/;

export function isValidHanziTerm(term: string): boolean {
	const trimmed = term.trim();
	return trimmed.length > 0 && HANZI_RE.test(trimmed);
}

export function splitHanzi(term: string): string[] {
	return [...term.trim()].filter((ch) => HANZI_RE.test(ch));
}

export function normalizeTerm(term: string): string {
	return term.trim().replace(/\s+/g, '');
}

export function uniqueTerms(terms: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const raw of terms) {
		const term = normalizeTerm(raw);
		if (!term || seen.has(term)) continue;
		seen.add(term);
		result.push(term);
	}
	return result;
}

export function rate(correct: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((correct / total) * 100);
}
