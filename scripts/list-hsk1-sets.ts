import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

async function main() {
	const { prisma } = await import('@/lib/prisma');
	const sets = await prisma.cnWordSet.findMany({
		where: { title: { contains: 'HSK1', mode: 'insensitive' } },
		orderBy: { createdAt: 'desc' },
		take: 15,
		select: {
			id: true,
			title: true,
			userId: true,
			source: true,
			createdAt: true,
			_count: { select: { items: true } },
		},
	});
	console.log(JSON.stringify(sets, null, 2));
	await prisma.$disconnect();
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
