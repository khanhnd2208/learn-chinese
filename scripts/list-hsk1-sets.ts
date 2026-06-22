import { prisma } from '@/lib/prisma';

async function main() {
	const sets = await prisma.cnWordSet.findMany({
		where: { title: { contains: 'HSK1', mode: 'insensitive' } },
		orderBy: { createdAt: 'desc' },
		take: 15,
		select: {
			id: true,
			title: true,
			userId: true,
			createdAt: true,
			_count: { select: { items: true } },
		},
	});
	console.log(JSON.stringify(sets, null, 2));
}

main()
	.catch((e) => console.error(e))
	.finally(() => prisma.$disconnect());
