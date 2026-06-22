import { config as loadEnv } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';

expand(loadEnv({ path: resolve(process.cwd(), '.env') }));
expand(loadEnv({ path: resolve(process.cwd(), '.env.local'), override: true }));

import { prisma } from '../src/lib/prisma';

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const counts = {
		attempts: await prisma.cnHanziAiProviderAttempt.count(),
		jobs: await prisma.cnHanziAiGenerationJob.count(),
		dependencies: await prisma.cnHanziAiFactDependency.count(),
		revisions: await prisma.cnHanziAiAnalysisRevision.count(),
		analyses: await prisma.cnHanziAiAnalysis.count(),
		reports: await prisma.cnHanziAiReport.count(),
	};

	console.log('Hanzi AI cache counts:', counts);

	if (dryRun) {
		console.log('Dry run — no rows deleted.');
		return;
	}

	await prisma.$transaction([
		prisma.cnHanziAiReport.deleteMany(),
		prisma.cnHanziAiProviderAttempt.deleteMany(),
		prisma.cnHanziAiGenerationJob.deleteMany(),
		prisma.cnHanziAiFactDependency.deleteMany(),
		prisma.cnHanziAiAnalysisRevision.deleteMany(),
		prisma.cnHanziAiAnalysis.deleteMany(),
	]);

	console.log('Purged all Hanzi AI analyses and related rows.');
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
