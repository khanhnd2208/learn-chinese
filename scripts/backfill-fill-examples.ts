/**
 * Backfill CnExample rows with auto fill_sentence metadata.
 * Manual only: npx tsx scripts/backfill-fill-examples.ts
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { enrichExampleForFillWithExisting } from '../src/lib/chinese/fillExampleValidator';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/learn_chinese';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	const examples = await prisma.cnExample.findMany({
		include: { word: { select: { simplified: true } } },
	});

	let updated = 0;
	let autoCount = 0;
	let draftCount = 0;
	let skippedVerified = 0;

	for (const ex of examples) {
		if (ex.naturalnessStatus === 'verified') {
			skippedVerified++;
			continue;
		}

		const fillMeta = enrichExampleForFillWithExisting(ex.hanzi, ex.word.simplified, ex);
		if (
			fillMeta.naturalnessStatus === ex.naturalnessStatus &&
			fillMeta.targetWordStart === ex.targetWordStart &&
			fillMeta.targetWordEnd === ex.targetWordEnd
		) {
			continue;
		}

		await prisma.cnExample.update({
			where: { id: ex.id },
			data: {
				naturalnessStatus: fillMeta.naturalnessStatus,
				targetWordStart: fillMeta.targetWordStart,
				targetWordEnd: fillMeta.targetWordEnd,
			},
		});
		updated++;
		if (fillMeta.naturalnessStatus === 'auto') autoCount++;
		if (fillMeta.naturalnessStatus === 'draft') draftCount++;
	}

	console.log(`Backfill complete: ${updated} updated (${autoCount} auto, ${draftCount} draft), ${skippedVerified} verified skipped`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
		await pool.end();
	});
