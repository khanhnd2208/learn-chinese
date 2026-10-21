#!/usr/bin/env npx tsx
/**
 * Backfill CnSetEnrollment from existing sets.
 *
 * - Every kept set gets an enrollment for its owner, copying set.srsActive.
 * - Copies titled "(từ thư viện)" that match a published original become a
 *   follow of that original, then the copy is deleted. Word progress stays.
 * - Per-user HSK sample copies that match a published sample set do the same.
 * - Unmatched personal sets stay. Thư viện shows them with a "Bộ cũ" badge.
 *
 * Idempotent. Publish the admin HSK sets first when you want sample copies
 * to collapse onto them:
 *   npx tsx scripts/provision-global-sample-sets.ts
 *   npx tsx scripts/migrate-set-enrollments.ts --dry-run
 *   npx tsx scripts/migrate-set-enrollments.ts
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

import { GLOBAL_SAMPLE_SET_DESCRIPTION } from '@/lib/chinese/hsk1SampleSets';
import {
	mergeEnrollmentSeeds,
	pendingSeeds,
	planSetEnrollmentMigration,
	type MigrationSetRef,
} from '@/lib/chinese/setEnrollmentMigration';

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const { prisma } = await import('@/lib/prisma');

	const rows = await prisma.cnWordSet.findMany({
		include: { items: { select: { wordId: true, rawTerm: true } } },
	});
	const sets: MigrationSetRef[] = rows.map((set) => ({
		id: set.id,
		userId: set.userId,
		title: set.title,
		description: set.description,
		shared: set.shared,
		srsActive: set.srsActive,
		createdAt: set.createdAt,
		items: set.items,
	}));
	const plan = planSetEnrollmentMigration(sets, GLOBAL_SAMPLE_SET_DESCRIPTION);
	const existing = await prisma.cnSetEnrollment.findMany({
		select: { userId: true, setId: true },
	});
	const merged = mergeEnrollmentSeeds([
		...plan.ownerEnrollments,
		...plan.copyMigrations.map((migration) => ({
			userId: migration.userId,
			setId: migration.setId,
			srsActive: migration.srsActive,
		})),
	]);
	const pending = pendingSeeds(merged, existing);

	const summary = {
		dryRun,
		sets: sets.length,
		enrollmentsToCreate: pending.length,
		copiesToDelete: plan.copyMigrations.length,
		legacySetsKept: plan.legacySetIds.length,
	};
	console.log(JSON.stringify(summary, null, 2));

	if (dryRun) {
		await prisma.$disconnect();
		return;
	}

	for (const seed of pending) {
		await prisma.cnSetEnrollment.upsert({
			where: { userId_setId: { userId: seed.userId, setId: seed.setId } },
			create: seed,
			update: {},
		});
	}

	const deleteIds = [...new Set(plan.copyMigrations.map((migration) => migration.deleteSetId))];
	if (deleteIds.length) {
		await prisma.cnWordSet.deleteMany({ where: { id: { in: deleteIds } } });
	}

	console.log(`Applied. Created ${pending.length} enrollment(s), deleted ${deleteIds.length} copy set(s).`);
	await prisma.$disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
