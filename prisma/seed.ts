/* ════════════════════════════════════════════════════════════════════════
   prisma/seed.ts — Seed nội dung + demo user
   Run: npm run db:seed
   ════════════════════════════════════════════════════════════════════════ */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { HANZI, SIMILAR_GROUPS, WORDS } from './seed-data/content';
import { resolveSeedUserId } from './seed-data/demo-user';
import { enrichExampleForFill } from '../src/lib/chinese/fillExampleValidator';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/learn_chinese';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parsePatternSamples(raw: string) {
	return raw.split('||').map((part) => {
		const [hanzi = '', pinyin = '', meaningVi = ''] = part.split('|').map((s) => s.trim());
		return { hanzi, pinyin, meaningVi };
	}).filter((s) => s.hanzi);
}

async function seedContent() {
	console.log('🌱 Seeding Chinese content...');

	const groupMap = new Map<string, string>();
	for (const g of SIMILAR_GROUPS) {
		const group = await prisma.cnSimilarGroup.upsert({
			where: { key: g.key },
			create: g,
			update: g,
		});
		groupMap.set(g.key, group.id);
	}
	console.log(`  ✅ ${SIMILAR_GROUPS.length} similar groups`);

	for (const h of HANZI) {
		const { similarGroupKey, ...data } = h;
		await prisma.cnHanzi.upsert({
			where: { char: data.char },
			create: {
				...data,
				similarGroupId: similarGroupKey ? groupMap.get(similarGroupKey) ?? null : null,
				status: 'published',
			},
			update: {
				...data,
				similarGroupId: similarGroupKey ? groupMap.get(similarGroupKey) ?? null : null,
				status: 'published',
			},
		});
	}
	console.log(`  ✅ ${HANZI.length} hanzi`);

	for (const w of WORDS) {
		const word = await prisma.cnWord.upsert({
			where: { simplified: w.simplified },
			create: {
				simplified: w.simplified,
				pinyin: w.pinyin,
				hanViet: w.hanViet,
				meaningVi: w.meaningVi,
				partOfSpeech: w.partOfSpeech,
				mnemonicVi: w.mnemonicVi,
				hskLevel: w.hskLevel,
				status: 'published',
			},
			update: {
				pinyin: w.pinyin,
				hanViet: w.hanViet,
				meaningVi: w.meaningVi,
				partOfSpeech: w.partOfSpeech,
				mnemonicVi: w.mnemonicVi,
				hskLevel: w.hskLevel,
				status: 'published',
			},
		});

		await prisma.cnWordChar.deleteMany({ where: { wordId: word.id } });
		for (let i = 0; i < w.chars.length; i++) {
			const hanzi = await prisma.cnHanzi.findUnique({ where: { char: w.chars[i] } });
			if (hanzi) {
				await prisma.cnWordChar.create({ data: { wordId: word.id, hanziId: hanzi.id, position: i } });
			}
		}

		if (w.example) {
			await prisma.cnExample.deleteMany({ where: { wordId: word.id } });
			const fillMeta = enrichExampleForFill(w.example.hanzi, w.simplified);
			await prisma.cnExample.create({
				data: {
					wordId: word.id,
					hanzi: w.example.hanzi,
					pinyin: w.example.pinyin,
					meaningVi: w.example.meaningVi,
					naturalnessStatus: fillMeta.naturalnessStatus,
					targetWordStart: fillMeta.targetWordStart,
					targetWordEnd: fillMeta.targetWordEnd,
				},
			});
		}

		if (w.pattern) {
			const samples = parsePatternSamples(w.pattern.samples);
			await prisma.cnSentencePattern.deleteMany({ where: { wordId: word.id } });
			await prisma.cnSentencePattern.create({
				data: { wordId: word.id, template: w.pattern.template, samples },
			});
		}
	}
	console.log(`  ✅ ${WORDS.length} words`);
}

async function main() {
	await seedContent();

	const userId = await resolveSeedUserId();
	if (userId) {
		console.log(`  ℹ️  Seed user: ${userId.slice(0, 8)}… (chỉ nội dung từ vựng, không tạo bộ demo)`);
	} else {
		console.log('  ⚠️  Chưa có SEED_USER_ID — seed chỉ ghi nội dung CnWord/CnHanzi');
	}

	console.log('✅ Seed complete!');
}

main()
	.catch((e) => { console.error(e); process.exit(1); })
	.finally(() => prisma.$disconnect());
