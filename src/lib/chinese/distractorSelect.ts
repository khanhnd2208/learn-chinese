import type { CnQuestionType, CnWordCardDTO } from '@/types/chinese';
import { normalizePinyinPlain } from '@/lib/chinese/pinyinNormalize';

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
		}
	}
	return dp[m][n];
}

function scoreCandidate(target: CnWordCardDTO, candidate: CnWordCardDTO): number {
	let score = 0;
	if (target.hskLevel !== null && candidate.hskLevel === target.hskLevel) score += 3;
	if (target.partOfSpeech && candidate.partOfSpeech === target.partOfSpeech) score += 2;
	if (target.learningPriority != null && candidate.learningPriority != null) {
		score += Math.max(0, 3 - Math.abs(target.learningPriority - candidate.learningPriority));
	}
	return score;
}

export function pickDistractorsForType(
	type: CnQuestionType,
	target: CnWordCardDTO,
	pool: CnWordCardDTO[],
	correct: string,
	count = 3,
	prefer: string[] = [],
	sentenceHanzi?: string,
): string[] {
	const others = pool.filter((w) => w.id !== target.id);
	let ranked: Array<{ value: string; score: number }> = [];

	switch (type) {
		case 'hanzi_to_meaning':
			ranked = others.map((w) => ({
				value: w.meaningVi,
				score: scoreCandidate(target, w),
			}));
			break;
		case 'meaning_to_hanzi':
		case 'fill_sentence':
			ranked = others
				.filter((w) => {
					if (type !== 'fill_sentence' || !sentenceHanzi) return true;
					if (w.simplified === correct) return false;
					return !sentenceHanzi.includes(w.simplified);
				})
				.map((w) => ({
					value: w.simplified,
					score: scoreCandidate(target, w)
						+ (Math.abs(w.simplified.length - target.simplified.length) <= 1 ? 2 : 0)
						+ (type === 'fill_sentence' && target.partOfSpeech && w.partOfSpeech === target.partOfSpeech ? 3 : 0),
				}));
			break;
		case 'pinyin_to_hanzi': {
			const targetPlain = normalizePinyinPlain(target.pinyinPlain ?? target.pinyin);
			ranked = others.map((w) => ({
				value: w.simplified,
				score: 10 - levenshtein(normalizePinyinPlain(w.pinyinPlain ?? w.pinyin), targetPlain),
			}));
			break;
		}
		case 'audio_to_hanzi':
			ranked = others.map((w) => ({ value: w.simplified, score: scoreCandidate(target, w) }));
			break;
		case 'audio_to_meaning':
			ranked = others.map((w) => ({
				value: w.meaningVi,
				score: scoreCandidate(target, w) + (w.meaningVi.length <= target.meaningVi.length + 6 ? 1 : 0),
			}));
			break;
		default:
			ranked = others.map((w) => ({ value: w.simplified, score: scoreCandidate(target, w) }));
	}

	const dedupedPool = unique(ranked.map((r) => r.value)).filter((v) => v !== correct);
	const preferred = unique(prefer).filter((v) => v !== correct && dedupedPool.includes(v));
	const byScore = new Map<string, number>();
	for (const row of ranked) {
		if (row.value === correct) continue;
		byScore.set(row.value, Math.max(byScore.get(row.value) ?? 0, row.score));
	}

	const rest = shuffle(
		dedupedPool
			.filter((v) => !preferred.includes(v))
			.sort((a, b) => (byScore.get(b) ?? 0) - (byScore.get(a) ?? 0)),
	);

	const out: string[] = [];
	for (const p of preferred) {
		if (out.length >= count) break;
		out.push(p);
	}
	for (const r of rest) {
		if (out.length >= count) break;
		if (!out.includes(r)) out.push(r);
	}
	return out.slice(0, count);
}

export function buildMcqOptionsForType(
	type: CnQuestionType,
	target: CnWordCardDTO,
	pool: CnWordCardDTO[],
	correct: string,
	count = 3,
	prefer: string[] = [],
	sentenceHanzi?: string,
): string[] | null {
	const distractors = pickDistractorsForType(type, target, pool, correct, count, prefer, sentenceHanzi);
	if (distractors.length < 1) return null;
	return shuffle(unique([correct, ...distractors]));
}
