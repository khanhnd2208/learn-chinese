/* ════════════════════════════════════════════════════════════════════════
   cnWordViewService.ts — Canonical word plus one learner's overlay
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import type { CnUserWordOverride, CnWord } from '@prisma/client';

export const WORD_OVERRIDE_FIELDS = [
	'pinyin',
	'hanViet',
	'meaningVi',
	'partOfSpeech',
	'ghiChu',
	'mnemonicVi',
] as const;

export type WordOverrideField = (typeof WORD_OVERRIDE_FIELDS)[number];
export type WordOverridePatch = Partial<Pick<CnUserWordOverride, WordOverrideField>>;

export interface CnWordViewExample {
	id: string;
	hanzi: string;
	pinyin: string;
	meaningVi: string;
	meaningViTemplate: string;
	targetWordStart: number | null;
	targetWordEnd: number | null;
	naturalnessStatus: string;
	ownerUserId: string | null;
}

export interface CnWordView {
	id: string;
	simplified: string;
	pinyin: string;
	hanViet: string;
	meaningVi: string;
	partOfSpeech: string;
	ghiChu: string;
	mnemonicVi: string;
	examples: CnWordViewExample[];
}

/** Null fields keep the canonical value. An empty string is an explicit learner edit. */
export function applyOverride<T extends WordOverridePatch>(word: T, override: WordOverridePatch | null): T {
	if (!override) return word;
	const next = { ...word };
	for (const field of WORD_OVERRIDE_FIELDS) {
		const value = override[field];
		if (value != null) next[field] = value;
	}
	return next;
}

export function examplesForUser<T extends { ownerUserId: string | null }>(
	examples: T[],
	userId: string,
): T[] {
	const own = examples.filter((example) => example.ownerUserId === userId);
	if (own.length > 0) return own;
	return examples.filter((example) => example.ownerUserId == null);
}

export async function loadWordViewsForUser(
	userId: string,
	wordIds: string[],
): Promise<Map<string, CnWordView>> {
	const uniqueIds = [...new Set(wordIds)];
	const map = new Map<string, CnWordView>();
	if (!uniqueIds.length) return map;

	const [words, overrides] = await Promise.all([
		prisma.cnWord.findMany({
			where: { id: { in: uniqueIds } },
			include: { examples: { orderBy: { id: 'asc' } } },
		}),
		prisma.cnUserWordOverride.findMany({
			where: { userId, wordId: { in: uniqueIds } },
		}),
	]);
	const overrideByWord = new Map(overrides.map((row) => [row.wordId, row]));

	for (const word of words) {
		map.set(word.id, toWordView(word, overrideByWord.get(word.id) ?? null, userId));
	}
	return map;
}

function toWordView(
	word: CnWord & { examples: CnWordViewExample[] },
	override: CnUserWordOverride | null,
	userId: string,
): CnWordView {
	const merged = applyOverride(word, override);
	return {
		id: word.id,
		simplified: word.simplified,
		pinyin: merged.pinyin,
		hanViet: merged.hanViet,
		meaningVi: merged.meaningVi,
		partOfSpeech: merged.partOfSpeech,
		ghiChu: merged.ghiChu,
		mnemonicVi: merged.mnemonicVi,
		examples: examplesForUser(word.examples, userId),
	};
}
