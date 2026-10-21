import type { Prisma } from '@prisma/client';

export interface CanonicalExampleInput {
	hanzi: string;
	pinyin: string;
	meaningVi: string;
	meaningViTemplate?: string;
	naturalnessStatus?: string;
	targetWordStart?: number | null;
	targetWordEnd?: number | null;
}

type ExampleSyncClient = Pick<Prisma.TransactionClient, 'cnExample'>;

function exampleKey(hanzi: string): string {
	return hanzi.normalize('NFC').trim();
}

function statusAfterSync(existingStatus: string, incomingStatus: string): string {
	if (existingStatus === 'verified' && incomingStatus === 'auto') return 'verified';
	return incomingStatus;
}

/** Match canonical examples by sentence text so a re-import keeps the same ids. */
export async function syncCanonicalExamples(
	tx: ExampleSyncClient,
	wordId: string,
	incoming: CanonicalExampleInput[],
): Promise<void> {
	const existing = await tx.cnExample.findMany({
		where: { wordId, ownerUserId: null },
	});
	const unused = new Map<string, typeof existing>();
	for (const row of existing) {
		const key = exampleKey(row.hanzi);
		const pool = unused.get(key) ?? [];
		pool.push(row);
		unused.set(key, pool);
	}

	const matchedIds = new Set<string>();
	for (const example of incoming) {
		const pool = unused.get(exampleKey(example.hanzi)) ?? [];
		const current = pool.shift();
		const meaningViTemplate = example.meaningViTemplate ?? '';
		const naturalnessStatus = example.naturalnessStatus ?? 'auto';
		const content = {
			pinyin: example.pinyin,
			meaningVi: example.meaningVi,
			meaningViTemplate,
			targetWordStart: example.targetWordStart ?? null,
			targetWordEnd: example.targetWordEnd ?? null,
		};
		if (current) {
			matchedIds.add(current.id);
			await tx.cnExample.update({
				where: { id: current.id },
				data: {
					...content,
					naturalnessStatus: statusAfterSync(current.naturalnessStatus, naturalnessStatus),
				},
			});
			continue;
		}
		await tx.cnExample.create({
			data: {
				wordId,
				hanzi: example.hanzi.normalize('NFC').trim(),
				ownerUserId: null,
				...content,
				naturalnessStatus,
			},
		});
	}

	const staleIds = existing.filter((row) => !matchedIds.has(row.id)).map((row) => row.id);
	if (staleIds.length) {
		await tx.cnExample.deleteMany({
			where: { id: { in: staleIds }, ownerUserId: null },
		});
	}
}
