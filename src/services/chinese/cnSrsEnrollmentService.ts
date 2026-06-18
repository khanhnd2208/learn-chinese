/* ════════════════════════════════════════════════════════════════════════
   cnSrsEnrollmentService.ts — Per-set SRS activation and word enrollment
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';

/** Word IDs from items in all SRS-active sets for this user */
export async function getSrsActiveWordIds(userId: string): Promise<Set<string>> {
	const items = await prisma.cnWordSetItem.findMany({
		where: {
			wordId: { not: null },
			set: { userId, srsActive: true },
		},
		select: { wordId: true },
	});
	return new Set(items.map((i) => i.wordId!));
}

/** Resolved word IDs in a specific set */
export async function getWordIdsInSet(userId: string, setId: string): Promise<string[]> {
	const items = await prisma.cnWordSetItem.findMany({
		where: { setId, wordId: { not: null }, set: { userId } },
		select: { wordId: true },
	});
	return items.map((i) => i.wordId!);
}

/**
 * Words in this set that would lose SRS progress if the set is deactivated/deleted:
 * not present in any OTHER srs-active set.
 */
export async function getExclusiveWordIdsForSet(userId: string, setId: string): Promise<string[]> {
	const setWordIds = await getWordIdsInSet(userId, setId);
	if (!setWordIds.length) return [];

	const otherActiveItems = await prisma.cnWordSetItem.findMany({
		where: {
			wordId: { in: setWordIds },
			set: { userId, srsActive: true, id: { not: setId } },
		},
		select: { wordId: true },
	});
	const coveredElsewhere = new Set(otherActiveItems.map((i) => i.wordId!));
	return setWordIds.filter((id) => !coveredElsewhere.has(id));
}

export async function enrollWordsInSrs(userId: string, wordIds: string[]): Promise<void> {
	const unique = [...new Set(wordIds)];
	if (!unique.length) return;
	const now = new Date();
	for (const wordId of unique) {
		await prisma.cnWordProgress.upsert({
			where: { userId_wordId: { userId, wordId } },
			create: { userId, wordId, state: 'new', dueAt: now },
			update: {},
		});
	}
}

export async function purgeSrsForWordIds(userId: string, wordIds: string[]): Promise<number> {
	const unique = [...new Set(wordIds)];
	if (!unique.length) return 0;
	const result = await prisma.cnWordProgress.deleteMany({
		where: { userId, wordId: { in: unique } },
	});
	return result.count;
}

export async function activateSetInSrs(userId: string, setId: string): Promise<void> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set) throw new Error('Bộ từ không tồn tại');

	await prisma.cnWordSet.update({ where: { id: setId }, data: { srsActive: true } });
	const wordIds = await getWordIdsInSet(userId, setId);
	await enrollWordsInSrs(userId, wordIds);
}

export async function deactivateSetFromSrs(
	userId: string,
	setId: string,
): Promise<{ purgedWordCount: number }> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set) throw new Error('Bộ từ không tồn tại');

	const exclusive = await getExclusiveWordIdsForSet(userId, setId);
	await prisma.cnWordSet.update({ where: { id: setId }, data: { srsActive: false } });
	const purgedWordCount = await purgeSrsForWordIds(userId, exclusive);
	return { purgedWordCount };
}

/** Call before deleting a set — purges SRS for exclusive words if set was active */
export async function onSetDeleted(userId: string, setId: string): Promise<number> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set?.srsActive) return 0;
	const exclusive = await getExclusiveWordIdsForSet(userId, setId);
	return purgeSrsForWordIds(userId, exclusive);
}

export async function previewDeactivateSet(
	userId: string,
	setId: string,
): Promise<{ exclusiveWordCount: number; wouldLoseProgress: boolean }> {
	const exclusive = await getExclusiveWordIdsForSet(userId, setId);
	return {
		exclusiveWordCount: exclusive.length,
		wouldLoseProgress: exclusive.length > 0,
	};
}

/** After removing a word from an SRS-active set, purge if no longer in any active set */
export async function onWordRemovedFromActiveSet(
	userId: string,
	setId: string,
	wordId: string,
): Promise<number> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set?.srsActive) return 0;

	const activeIds = await getSrsActiveWordIds(userId);
	if (activeIds.has(wordId)) return 0;
	return purgeSrsForWordIds(userId, [wordId]);
}
