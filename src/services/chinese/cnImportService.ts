/* ════════════════════════════════════════════════════════════════════════
   cnImportService.ts — Admin Chinese content import
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { splitHanzi } from '@/lib/chinese/hanziUtils';
import { enrichExampleForFill } from '@/lib/chinese/fillExampleValidator';
import type { CnImportHanziRow, CnImportPreview, CnImportWordRow } from '@/lib/chinese/parseChineseFile';
import type { Prisma } from '@prisma/client';
import type { HanziAiReconcileTrigger } from '@/services/chinese/hanziAi/hanziAiAdminService';
import { reconcileHanziAiInTransaction } from '@/services/chinese/hanziAi/hanziAiAdminService';

type DbClient = typeof prisma | Prisma.TransactionClient;

function parsePatternSamples(raw: string): Array<{ hanzi: string; pinyin: string; meaningVi: string }> {
	if (!raw.trim()) return [];
	return raw.split('||').map((part) => {
		const [hanzi = '', pinyin = '', meaningVi = ''] = part.split('|').map((s) => s.trim());
		return { hanzi, pinyin, meaningVi };
	}).filter((s) => s.hanzi);
}

async function ensureHanzi(db: DbClient, char: string, status: 'draft' | 'published') {
	const existing = await db.cnHanzi.findUnique({ where: { char } });
	if (existing) return existing;
	return db.cnHanzi.create({
		data: { char, status },
	});
}

async function ensureSimilarGroup(db: DbClient, key: string) {
	if (!key) return null;
	const existing = await db.cnSimilarGroup.findUnique({ where: { key } });
	if (existing) return existing;
	return db.cnSimilarGroup.create({ data: { key, note: '' } });
}

export async function publishHanziRows(
	rows: CnImportHanziRow[],
	db: DbClient = prisma,
): Promise<{ count: number; triggers: HanziAiReconcileTrigger[] }> {
	let count = 0;
	const triggers: HanziAiReconcileTrigger[] = [];
	for (const row of rows) {
		const group = row.similarGroupKey ? await ensureSimilarGroup(db, row.similarGroupKey) : null;
		const hanzi = await db.cnHanzi.upsert({
			where: { char: row.char },
			create: {
				char: row.char,
				pinyin: row.pinyin,
				hanViet: row.hanViet,
				meaningVi: row.meaningVi,
				components: row.components,
				radical: row.radical,
				mnemonicVi: row.mnemonicVi,
				similarGroupId: group?.id ?? null,
				status: row.status,
			},
			update: {
				pinyin: row.pinyin,
				hanViet: row.hanViet,
				meaningVi: row.meaningVi,
				components: row.components,
				radical: row.radical,
				mnemonicVi: row.mnemonicVi,
				similarGroupId: group?.id ?? null,
				status: row.status,
			},
		});
		triggers.push({ type: 'hanzi', id: hanzi.id, chars: [row.char] });
		count++;
	}
	return { count, triggers };
}

export async function publishWordRows(
	rows: CnImportWordRow[],
	db: DbClient = prisma,
): Promise<{ count: number; triggers: HanziAiReconcileTrigger[] }> {
	let count = 0;
	const triggers: HanziAiReconcileTrigger[] = [];
	for (const row of rows) {
		const word = await db.cnWord.upsert({
			where: { simplified: row.simplified },
			create: {
				simplified: row.simplified,
				pinyin: row.pinyin,
				hanViet: row.hanViet,
				meaningVi: row.meaningVi,
				partOfSpeech: row.partOfSpeech,
				mnemonicVi: row.mnemonicVi,
				hskLevel: row.hskLevel,
				status: row.status,
			},
			update: {
				pinyin: row.pinyin,
				hanViet: row.hanViet,
				meaningVi: row.meaningVi,
				partOfSpeech: row.partOfSpeech,
				mnemonicVi: row.mnemonicVi,
				hskLevel: row.hskLevel,
				status: row.status,
			},
		});

		await db.cnWordChar.deleteMany({ where: { wordId: word.id } });
		const charList = row.chars ? row.chars.split(/[,|]/).map((s) => s.trim()).filter(Boolean) : splitHanzi(row.simplified);
		for (let i = 0; i < charList.length; i++) {
			const hanzi = await ensureHanzi(db, charList[i], row.status);
			await db.cnWordChar.create({
				data: { wordId: word.id, hanziId: hanzi.id, position: i },
			});
		}

		if (row.exampleHanzi || row.exampleSentences) {
			await db.cnExample.deleteMany({ where: { wordId: word.id } });
			const examples = row.exampleSentences
				? parsePatternSamples(row.exampleSentences)
				: row.exampleHanzi
					? [{ hanzi: row.exampleHanzi, pinyin: row.examplePinyin, meaningVi: row.exampleMeaningVi }]
					: [];
			if (examples.length) {
				await db.cnExample.createMany({
					data: examples.map((ex) => {
						const fillMeta = enrichExampleForFill(ex.hanzi, row.simplified);
						return {
							wordId: word.id,
							hanzi: ex.hanzi,
							pinyin: ex.pinyin,
							meaningVi: ex.meaningVi,
							meaningViTemplate: ex.meaningVi.includes('__') ? ex.meaningVi : '',
							naturalnessStatus: fillMeta.naturalnessStatus,
							targetWordStart: fillMeta.targetWordStart,
							targetWordEnd: fillMeta.targetWordEnd,
						};
					}),
				});
			}
		}

		if (row.patternTemplate) {
			await db.cnSentencePattern.deleteMany({ where: { wordId: word.id } });
			await db.cnSentencePattern.create({
				data: {
					wordId: word.id,
					template: row.patternTemplate,
					samples: parsePatternSamples(row.patternSamples),
				},
			});
		}

		triggers.push({ type: 'word', id: word.id, term: word.simplified, chars: charList });
		count++;
	}
	return { count, triggers };
}

export async function publishImportPreview(preview: CnImportPreview, type: 'words' | 'hanzi') {
	if (preview.errors.length) {
		throw new Error(`Import có ${preview.errors.length} lỗi — sửa trước khi publish`);
	}
	const result = await prisma.$transaction(async (tx) => {
		if (type === 'hanzi') {
			const { count, triggers } = await publishHanziRows(preview.hanzi, tx);
			await reconcileHanziAiInTransaction(tx, triggers);
			return { type, count, warnings: preview.warnings };
		}
		const { count, triggers } = await publishWordRows(preview.words, tx);
		await reconcileHanziAiInTransaction(tx, triggers);
		return { type, count, warnings: preview.warnings };
	});
	return result;
}
