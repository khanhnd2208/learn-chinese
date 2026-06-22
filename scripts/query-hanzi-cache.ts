import { config } from 'dotenv';
config({ path: '.env.local' });
import { HANZI_LIVE_CORPUS_TERMS } from '../src/lib/harness';
import { prisma } from '../src/lib/prisma';

const terms = [...HANZI_LIVE_CORPUS_TERMS];

async function main() {
	const rows = await prisma.cnHanziAiAnalysis.findMany({
		where: { normalizedTerm: { in: terms } },
		select: {
			normalizedTerm: true,
			contentStatus: true,
			currentRevision: { select: { resultJson: true, promptVersion: true } },
		},
	});
	console.log('found', rows.length);
	for (const t of terms) {
		const r = rows.find((x) => x.normalizedTerm === t);
		console.log(t, r ? r.contentStatus : 'NOT_CACHED', r?.currentRevision?.promptVersion ?? '');
	}
}

main().finally(() => prisma.$disconnect());
