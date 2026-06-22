#!/usr/bin/env npx tsx
/**
 * Purge all global HSK1 sample sets (and their items) for every user.
 * Does NOT touch CnWordProgress for words still in other sets.
 *
 * Dry-run by default. Pass --execute to actually delete.
 *
 * Run: npx tsx scripts/purge-sample-sets.ts [--execute]
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

import {
	GLOBAL_SAMPLE_SET_DESCRIPTION,
	GLOBAL_SAMPLE_SET_TITLES,
} from '@/lib/chinese/hsk1SampleSets';
import { isLegacyDemoSet } from '@/lib/chinese/legacyDemoSets';

const DRY_RUN = !process.argv.includes('--execute');

function isSampleSet(set: { title: string; description: string; source: string }): boolean {
	if (set.description === GLOBAL_SAMPLE_SET_DESCRIPTION) return true;
	if (GLOBAL_SAMPLE_SET_TITLES.includes(set.title as (typeof GLOBAL_SAMPLE_SET_TITLES)[number])) {
		return true;
	}
	return isLegacyDemoSet(set);
}

async function main() {
	const { prisma } = await import('@/lib/prisma');
	const { onSetDeleted } = await import('@/services/chinese/cnSrsEnrollmentService');

	const allSets = await prisma.cnWordSet.findMany({
		select: {
			id: true,
			userId: true,
			title: true,
			description: true,
			source: true,
			_count: { select: { items: true } },
		},
		orderBy: { userId: 'asc' },
	});

	const sets = allSets.filter(isSampleSet);

	if (sets.length === 0) {
		console.log('No sample sets found. Nothing to do.');
		process.exit(0);
	}

	const totalItems = sets.reduce((sum, s) => sum + s._count.items, 0);
	console.log(`Found ${sets.length} sample set(s) across users (${totalItems} items total):`);

	const byUser: Record<string, typeof sets> = {};
	for (const s of sets) {
		(byUser[s.userId] ??= []).push(s);
	}
	for (const [userId, userSets] of Object.entries(byUser)) {
		console.log(`  User ${userId.slice(0, 8)}…  →  ${userSets.map((s) => `"${s.title}"`).join(', ')}`);
	}

	if (DRY_RUN) {
		console.log('\n[DRY RUN] No changes made. Re-run with --execute to delete.');
		process.exit(0);
	}

	console.log('\nDeleting…');
	for (const set of sets) {
		await onSetDeleted(set.userId, set.id);
		await prisma.cnWordSet.delete({ where: { id: set.id } });
	}
	console.log(`✅ Deleted ${sets.length} sample set(s) (items cascade-deleted automatically).`);
	await prisma.$disconnect();
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
