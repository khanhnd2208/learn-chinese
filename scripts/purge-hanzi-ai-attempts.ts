/**
 * Purge CnHanziAiProviderAttempt rows older than 30 days.
 * Run via cron or manually: npx tsx scripts/purge-hanzi-ai-attempts.ts
 */
import { PrismaClient } from '@prisma/client';

const RETENTION_DAYS = 30;

async function main() {
	const prisma = new PrismaClient();
	const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
	const result = await prisma.cnHanziAiProviderAttempt.deleteMany({
		where: { createdAt: { lt: cutoff } },
	});
	console.log(`Purged ${result.count} Hanzi AI provider attempts older than ${RETENTION_DAYS} days.`);
	await prisma.$disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
