#!/usr/bin/env npx tsx
/**
 * Backfill pinyin variants, example target offsets, and primary word senses.
 * Run: npx tsx scripts/backfill-content-metadata.ts
 */
import { prisma } from '@/lib/prisma';
import { pinyinVariantsFromCanonical } from '@/lib/chinese/pinyinNormalize';

function findTargetOffsets(hanzi: string, target: string): { start: number; end: number } | null {
	const idx = hanzi.indexOf(target);
	if (idx !== -1) {
		return { start: idx, end: idx + target.length };
	}
	return null;
}

async function main() {
	const words = await prisma.cnWord.findMany({
		select: { id: true, simplified: true, pinyin: true, meaningVi: true, partOfSpeech: true },
	});
	let wordUpdates = 0;
	for (const word of words) {
		if (!word.pinyin.trim()) continue;
		const variants = pinyinVariantsFromCanonical(word.pinyin);
		await prisma.cnWord.update({
			where: { id: word.id },
			data: {
				pinyinPlain: variants.plain,
				pinyinNumbered: variants.numbered,
				pinyinSyllables: variants.syllables,
				tones: variants.syllables.map((s) => {
					const m = s.match(/[1-5]$/);
					return m ? Number(m[1]) : 0;
				}).filter((t) => t > 0),
			},
		});
		wordUpdates++;

		const existingSense = await prisma.cnWordSense.findFirst({ where: { wordId: word.id, isPrimary: true } });
		if (!existingSense && word.meaningVi.trim()) {
			await prisma.cnWordSense.create({
				data: {
					wordId: word.id,
					meaningVi: word.meaningVi,
					partOfSpeech: word.partOfSpeech,
					isPrimary: true,
				},
			});
		}
	}

	const examples = await prisma.cnExample.findMany({
		include: { word: { select: { simplified: true } } },
	});
	let exampleUpdates = 0;
	for (const ex of examples) {
		const offsets = findTargetOffsets(ex.hanzi, ex.word.simplified);
		if (!offsets) continue;
		await prisma.cnExample.update({
			where: { id: ex.id },
			data: {
				targetWordStart: offsets.start,
				targetWordEnd: offsets.end,
			},
		});
		exampleUpdates++;
	}

	console.log(`Updated ${wordUpdates} words (pinyin variants) and ${exampleUpdates} examples (target offsets).`);
}

main()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
