import { prisma } from '@/lib/prisma';
import { getRadicalVariant } from './hanziTrustRegistry';
import type { HanziAnalysisResult } from './hanziAnalysisSchema';
import type { HanziPartLexicon, HanziPartLexiconEntry } from './hanziAiTypes';

function collectPartChars(analysis: HanziAnalysisResult): string[] {
	const chars = new Set<string>();
	for (const row of analysis.characters) {
		if (row.radical?.char) chars.add(row.radical.char);
		if (row.radical?.standardChar) chars.add(row.radical.standardChar);
		for (const component of row.components) {
			chars.add(component.char);
		}
	}
	return [...chars];
}

function dbEntry(
	row: { pinyin: string; hanViet: string; meaningVi: string },
): HanziPartLexiconEntry {
	return {
		pinyin: row.pinyin || null,
		hanViet: row.hanViet || null,
		meaningVi: row.meaningVi || null,
		source: 'database',
	};
}

function radicalMetaEntry(
	nameVi: string,
	meaningVi: string,
): HanziPartLexiconEntry {
	return {
		pinyin: null,
		hanViet: nameVi || null,
		meaningVi: meaningVi || null,
		source: 'radical_meta',
	};
}

function aiHintEntry(meaningVi: string): HanziPartLexiconEntry {
	return {
		pinyin: null,
		hanViet: null,
		meaningVi: meaningVi || null,
		source: 'ai_hint',
	};
}

function mergeEntry(
	primary: HanziPartLexiconEntry,
	fallback: HanziPartLexiconEntry,
): HanziPartLexiconEntry {
	return {
		pinyin: primary.pinyin ?? fallback.pinyin,
		hanViet: primary.hanViet ?? fallback.hanViet,
		meaningVi: primary.meaningVi ?? fallback.meaningVi,
		source: primary.source !== 'ai_hint' ? primary.source : fallback.source,
	};
}

function resolveCharEntry(
	char: string,
	dbMap: Map<string, { pinyin: string; hanViet: string; meaningVi: string }>,
	radicalHints: Map<string, { nameVi: string; meaningVi: string }>,
	aiHints: Map<string, string>,
): HanziPartLexiconEntry {
	const dbRow = dbMap.get(char);
	if (dbRow?.pinyin && dbRow?.hanViet && dbRow?.meaningVi) {
		return dbEntry(dbRow);
	}

	const variant = getRadicalVariant(char);
	const standardChar = variant?.standardChar;
	const standardDb = standardChar ? dbMap.get(standardChar) : undefined;

	let entry: HanziPartLexiconEntry = dbRow
		? dbEntry(dbRow)
		: radicalHints.has(char)
			? radicalMetaEntry(radicalHints.get(char)!.nameVi, radicalHints.get(char)!.meaningVi)
			: aiHints.has(char)
				? aiHintEntry(aiHints.get(char)!)
				: { pinyin: null, hanViet: null, meaningVi: null, source: 'ai_hint' };

	if (standardDb) {
		entry = mergeEntry(
			entry,
			dbEntry(standardDb),
		);
	} else if (variant && !entry.hanViet) {
		entry = mergeEntry(entry, radicalMetaEntry(variant.nameVi, entry.meaningVi ?? ''));
	}

	if (!entry.meaningVi && aiHints.has(char)) {
		entry = mergeEntry(entry, aiHintEntry(aiHints.get(char)!));
	}

	return entry;
}

export async function buildHanziPartLexicon(analysis: HanziAnalysisResult): Promise<HanziPartLexicon> {
	const partChars = collectPartChars(analysis);
	if (!partChars.length) return {};

	const lookupChars = new Set(partChars);
	for (const char of partChars) {
		const variant = getRadicalVariant(char);
		if (variant?.standardChar) lookupChars.add(variant.standardChar);
	}

	const rows = await prisma.cnHanzi.findMany({
		where: { char: { in: [...lookupChars] }, status: 'published' },
		select: { char: true, pinyin: true, hanViet: true, meaningVi: true },
	});
	const dbMap = new Map(rows.map((r) => [r.char, r]));

	const radicalHints = new Map<string, { nameVi: string; meaningVi: string }>();
	const aiHints = new Map<string, string>();

	for (const row of analysis.characters) {
		if (row.radical) {
			radicalHints.set(row.radical.char, {
				nameVi: row.radical.nameVi,
				meaningVi: row.radical.meaningVi,
			});
		}
		for (const component of row.components) {
			if (component.meaningVi && component.claimTrust !== 'unverified') {
				aiHints.set(component.char, component.meaningVi);
			}
		}
	}

	const lexicon: HanziPartLexicon = {};
	for (const char of partChars) {
		lexicon[char] = resolveCharEntry(char, dbMap, radicalHints, aiHints);
	}
	return lexicon;
}
