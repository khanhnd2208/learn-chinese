/* ════════════════════════════════════════════════════════════════════════
   cnSrsEnrollmentService.ts — Review pool via CnSetEnrollment
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { normalizeTerm } from '@/lib/chinese/hanziUtils';
import { canViewSet } from '@/services/chinese/cnEnrollmentService';

function activeEnrollment(userId: string) {
	return { enrollments: { some: { userId, srsActive: true } } };
}

/** Word IDs from items in sets this user is actively reviewing. */
export async function getSrsActiveWordIds(userId: string): Promise<Set<string>> {
	const items = await prisma.cnWordSetItem.findMany({
		where: {
			wordId: { not: null },
			set: activeEnrollment(userId),
		},
		select: { wordId: true },
	});
	return new Set(items.map((i) => i.wordId!));
}

/**
 * Review pool for practice/review/inferno — heals stale set items and includes
 * legacy CnWordProgress rows whose word matches a rawTerm in an active enrollment.
 * A published set the user does not follow stays out of the pool.
 */
export async function resolveSrsPoolWordIds(userId: string): Promise<Set<string>> {
	const activeItems = await prisma.cnWordSetItem.findMany({
		where: { set: activeEnrollment(userId) },
		select: { id: true, wordId: true, rawTerm: true },
	});

	const ids = new Set<string>();
	const unresolved: Array<{ id: string; rawTerm: string }> = [];
	const healUpdates: Array<{ itemId: string; wordId: string }> = [];

	for (const item of activeItems) {
		if (item.wordId) ids.add(item.wordId);
		else unresolved.push({ id: item.id, rawTerm: item.rawTerm });
	}

	if (unresolved.length) {
		const normalizedTerms = [...new Set(unresolved.map((u) => normalizeTerm(u.rawTerm)).filter(Boolean))];
		const publishedWords = normalizedTerms.length
			? await prisma.cnWord.findMany({
				where: { simplified: { in: normalizedTerms }, status: 'published' },
				select: { id: true, simplified: true },
			})
			: [];
		const bySimplified = new Map(publishedWords.map((w) => [w.simplified, w.id]));

		for (const item of unresolved) {
			const wordId = bySimplified.get(normalizeTerm(item.rawTerm));
			if (!wordId) continue;
			ids.add(wordId);
			healUpdates.push({ itemId: item.id, wordId });
		}
	}

	const rawTerms = [...new Set(
		activeItems.map((i) => normalizeTerm(i.rawTerm)).filter(Boolean),
	)];
	if (!rawTerms.length) {
		if (healUpdates.length) {
			await prisma.$transaction(
				healUpdates.map(({ itemId, wordId }) =>
					prisma.cnWordSetItem.update({ where: { id: itemId }, data: { wordId } }),
				),
			);
		}
		return ids;
	}

	const [progressRows, wordsBySimplified] = await Promise.all([
		prisma.cnWordProgress.findMany({
			where: { userId, word: { simplified: { in: rawTerms } } },
			select: { wordId: true, word: { select: { simplified: true } } },
		}),
		prisma.cnWord.findMany({
			where: { simplified: { in: rawTerms } },
			select: { id: true, simplified: true },
		}),
	]);

	const termSet = new Set(rawTerms);
	for (const row of progressRows) {
		if (termSet.has(row.word.simplified)) ids.add(row.wordId);
	}

	for (const word of wordsBySimplified) {
		if (!termSet.has(word.simplified)) continue;
		ids.add(word.id);
		const staleItems = activeItems.filter(
			(i) => !i.wordId && normalizeTerm(i.rawTerm) === word.simplified,
		);
		for (const item of staleItems) {
			healUpdates.push({ itemId: item.id, wordId: word.id });
		}
	}

	if (healUpdates.length) {
		await prisma.$transaction(
			healUpdates.map(({ itemId, wordId }) =>
				prisma.cnWordSetItem.update({ where: { id: itemId }, data: { wordId } }),
			),
		);
	}

	return ids;
}

/** Resolved word IDs in a set the user is allowed to open. */
export async function getWordIdsInSet(userId: string, setId: string): Promise<string[]> {
	if (!(await canViewSet(userId, setId))) return [];
	const items = await prisma.cnWordSetItem.findMany({
		where: { setId, wordId: { not: null } },
		select: { wordId: true },
	});
	return items.map((i) => i.wordId!);
}

async function enrollmentIsActive(userId: string, setId: string): Promise<boolean> {
	const enrollment = await prisma.cnSetEnrollment.findUnique({
		where: { userId_setId: { userId, setId } },
		select: { srsActive: true },
	});
	return enrollment?.srsActive === true;
}

/**
 * Words in this set that would leave the review pool if this enrollment pauses:
 * not present in any OTHER set the user is actively reviewing.
 */
export async function getExclusiveWordIdsForSet(userId: string, setId: string): Promise<string[]> {
	const setWordIds = await getWordIdsInSet(userId, setId);
	if (!setWordIds.length) return [];

	const otherActiveItems = await prisma.cnWordSetItem.findMany({
		where: {
			wordId: { in: setWordIds },
			set: { ...activeEnrollment(userId), id: { not: setId } },
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
	await prisma.cnWordProgress.createMany({
		data: unique.map((wordId) => ({ userId, wordId, state: 'new' as const, dueAt: now })),
		skipDuplicates: true,
	});
}

/** Self-heal: upsert CnWordProgress for reviewing words missing enrollment */
export async function ensureEnrollmentForActiveWords(userId: string, activeWordIds: string[]): Promise<void> {
	const poolIds = activeWordIds.length ? activeWordIds : [...await resolveSrsPoolWordIds(userId)];
	if (!poolIds.length) return;
	const existing = await prisma.cnWordProgress.findMany({
		where: { userId, wordId: { in: poolIds } },
		select: { wordId: true },
	});
	const enrolled = new Set(existing.map((r) => r.wordId));
	const missing = poolIds.filter((id) => !enrolled.has(id));
	if (missing.length) await enrollWordsInSrs(userId, missing);
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
	if (!(await canViewSet(userId, setId))) throw new Error('Bộ từ không tồn tại');

	await prisma.cnSetEnrollment.upsert({
		where: { userId_setId: { userId, setId } },
		create: { userId, setId, srsActive: true },
		update: { srsActive: true },
	});
	const wordIds = await getWordIdsInSet(userId, setId);
	await enrollWordsInSrs(userId, wordIds);
}

/** Pause review for this follower. Progress rows stay. */
export async function deactivateSetFromSrs(userId: string, setId: string): Promise<void> {
	const enrollment = await prisma.cnSetEnrollment.findUnique({
		where: { userId_setId: { userId, setId } },
		select: { id: true },
	});
	if (!enrollment) throw new Error('Bộ từ không tồn tại');

	await prisma.cnSetEnrollment.update({
		where: { userId_setId: { userId, setId } },
		data: { srsActive: false },
	});
}

/** Explicit purge: delete review progress for words only in this set */
export async function purgeSrsProgressForSet(
	userId: string,
	setId: string,
): Promise<{ purgedWordCount: number }> {
	if (!(await canViewSet(userId, setId))) throw new Error('Bộ từ không tồn tại');

	const exclusive = await getExclusiveWordIdsForSet(userId, setId);
	const purgedWordCount = await purgeSrsForWordIds(userId, exclusive);
	return { purgedWordCount };
}

/** Call before deleting a set — purges review rows for the acting user only. */
export async function onSetDeleted(userId: string, setId: string): Promise<number> {
	if (!(await enrollmentIsActive(userId, setId))) return 0;
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

/** Preview review impact of removing one word from a set the user is reviewing */
export async function previewRemoveWordFromSet(
	userId: string,
	setId: string,
	wordId: string,
): Promise<{ wouldPurgeProgress: boolean; inOtherActiveSet: boolean }> {
	if (!(await enrollmentIsActive(userId, setId))) {
		return { wouldPurgeProgress: false, inOtherActiveSet: false };
	}

	const otherActiveItems = await prisma.cnWordSetItem.findMany({
		where: {
			wordId,
			set: { ...activeEnrollment(userId), id: { not: setId } },
		},
		select: { wordId: true },
	});
	const inOtherActiveSet = otherActiveItems.length > 0;
	return {
		wouldPurgeProgress: !inOtherActiveSet,
		inOtherActiveSet,
	};
}

/** After removing a word from a set under review, purge if no longer in any active enrollment */
export async function onWordRemovedFromActiveSet(
	userId: string,
	setId: string,
	wordId: string,
): Promise<number> {
	if (!(await enrollmentIsActive(userId, setId))) return 0;

	const stillInActiveSet = await prisma.cnWordSetItem.count({
		where: {
			wordId,
			set: activeEnrollment(userId),
		},
	});
	if (stillInActiveSet > 0) return 0;
	return purgeSrsForWordIds(userId, [wordId]);
}
