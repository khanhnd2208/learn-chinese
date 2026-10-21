/* ════════════════════════════════════════════════════════════════════════
   cnWordViewService.ts — Canonical word plus one learner's overlay
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import type { Prisma, CnUserWordOverride, CnWord } from '@prisma/client';

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

export interface UserWordExampleWrite {
	hanzi: string;
	pinyin: string;
	meaningVi: string;
	meaningViTemplate?: string;
	naturalnessStatus?: string;
	targetWordStart?: number | null;
	targetWordEnd?: number | null;
}

export interface UserWordWrite {
	simplified: string;
	pinyin?: string;
	hanViet?: string;
	meaningVi?: string;
	partOfSpeech?: string;
	ghiChu?: string;
	mnemonicVi?: string;
	examples?: UserWordExampleWrite[];
}

type WordOverlayClient = Pick<Prisma.TransactionClient, 'cnWord' | 'cnUserWordOverride' | 'cnExample'>;

/** Writes a learner overlay. Never updates an existing canonical word or its examples. */
export async function writeUserWordOverlay(
	db: WordOverlayClient,
	userId: string,
	input: UserWordWrite,
): Promise<{ id: string }> {
	const existing = await db.cnWord.findUnique({ where: { simplified: input.simplified } });
	const word = existing ?? await db.cnWord.create({
		data: {
			simplified: input.simplified,
			pinyin: input.pinyin ?? '',
			hanViet: input.hanViet ?? '',
			meaningVi: input.meaningVi ?? '',
			partOfSpeech: input.partOfSpeech ?? '',
			ghiChu: input.ghiChu ?? '',
			mnemonicVi: input.mnemonicVi ?? '',
			status: 'published',
			createdByUserId: userId,
		},
	});

	const patch: WordOverridePatch = {};
	for (const field of WORD_OVERRIDE_FIELDS) {
		const value = input[field];
		if (value !== undefined) patch[field] = value;
	}
	await db.cnUserWordOverride.upsert({
		where: { userId_wordId: { userId, wordId: word.id } },
		create: { userId, wordId: word.id, ...patch },
		update: patch,
	});

	if (input.examples) {
		await db.cnExample.deleteMany({ where: { wordId: word.id, ownerUserId: userId } });
		if (input.examples.length) {
			await db.cnExample.createMany({
				data: input.examples.map((example) => ({
					wordId: word.id,
					hanzi: example.hanzi,
					pinyin: example.pinyin,
					meaningVi: example.meaningVi,
					meaningViTemplate: example.meaningViTemplate ?? '',
					naturalnessStatus: example.naturalnessStatus ?? 'auto',
					targetWordStart: example.targetWordStart ?? null,
					targetWordEnd: example.targetWordEnd ?? null,
					ownerUserId: userId,
				})),
			});
		}
	}

	return { id: word.id };
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
