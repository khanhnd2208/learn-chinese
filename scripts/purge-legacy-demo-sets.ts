import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { prisma } from '@/lib/prisma';
import { isLegacyDemoSet } from '@/lib/chinese/legacyDemoSets';
import { onSetDeleted } from '@/services/chinese/cnSrsEnrollmentService';

expand(config({ path: resolve(process.cwd(), '.env') }));
expand(config({ path: resolve(process.cwd(), '.env.local'), override: true }));

const dryRun = process.argv.includes('--dry-run');

async function main() {
	const sets = await prisma.cnWordSet.findMany({
		select: { id: true, userId: true, title: true, description: true, source: true },
		orderBy: { createdAt: 'asc' },
	});

	const targets = sets.filter((set) => isLegacyDemoSet(set));
	if (!targets.length) {
		console.log('No legacy demo sets found.');
		return;
	}

	console.log(`${dryRun ? '[dry-run] ' : ''}Removing ${targets.length} legacy demo set(s):`);
	for (const set of targets) {
		console.log(`  - ${set.title} (user ${set.userId.slice(0, 8)}…)`);
		if (dryRun) continue;
		await onSetDeleted(set.userId, set.id);
		await prisma.cnWordSet.delete({ where: { id: set.id } });
	}

	if (!dryRun) {
		console.log('Done. Sample duy nhất: tải file tại GET /api/sets/sample');
	}
}

main()
	.catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
