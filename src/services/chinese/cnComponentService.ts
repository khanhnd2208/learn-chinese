/* ════════════════════════════════════════════════════════════════════════
   cnComponentService.ts — Cross-word component familiarity
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import type { CnWord } from '@prisma/client';

type CharWithMeta = {
	char: string;
	radical: string;
	components: string[];
	similarGroupId: string | null;
};

export function componentKeysFromChars(chars: CharWithMeta[]): string[] {
	const keys = new Set<string>();
	for (const c of chars) {
		if (c.radical) keys.add(`radical:${c.radical}`);
		if (c.similarGroupId) keys.add(`phonetic:${c.similarGroupId}`);
		for (const comp of c.components) {
			if (comp) keys.add(`comp:${comp}`);
		}
	}
	return [...keys];
}

export async function bumpComponentFamiliarity(
	userId: string,
	componentKeys: string[],
	correct: boolean,
): Promise<void> {
	if (!componentKeys.length) return;
	const now = new Date();
	for (const componentKey of componentKeys) {
		const existing = await prisma.cnUserComponentProgress.findUnique({
			where: { userId_componentKey: { userId, componentKey } },
		});
		const delta = correct ? 2 : -1;
		if (existing) {
			await prisma.cnUserComponentProgress.update({
				where: { id: existing.id },
				data: {
					familiarity: Math.max(0, Math.min(100, existing.familiarity + delta)),
					correctCount: existing.correctCount + (correct ? 1 : 0),
					totalCount: existing.totalCount + 1,
					lastSeenAt: now,
				},
			});
		} else {
			await prisma.cnUserComponentProgress.create({
				data: {
					userId,
					componentKey,
					familiarity: correct ? 10 : 0,
					correctCount: correct ? 1 : 0,
					totalCount: 1,
					lastSeenAt: now,
				},
			});
		}
	}
}

export async function getComponentFamiliarityBoost(
	userId: string,
	componentKeys: string[],
): Promise<number> {
	if (!componentKeys.length) return 0;
	const rows = await prisma.cnUserComponentProgress.findMany({
		where: { userId, componentKey: { in: componentKeys } },
	});
	if (!rows.length) return 0;
	const avg = rows.reduce((s, r) => s + r.familiarity, 0) / rows.length;
	return avg >= 50 ? 1 : 0;
}

export async function findWordsSharingComponent(
	componentKey: string,
	limit = 8,
): Promise<CnWord[]> {
	const [kind, value] = componentKey.split(':');
	if (!value) return [];

	if (kind === 'phonetic') {
		const hanzi = await prisma.cnHanzi.findMany({
			where: { similarGroupId: value },
			select: { id: true },
		});
		const hanziIds = hanzi.map((h) => h.id);
		if (!hanziIds.length) return [];
		const wordChars = await prisma.cnWordChar.findMany({
			where: { hanziId: { in: hanziIds } },
			select: { wordId: true },
			distinct: ['wordId'],
			take: limit,
		});
		return prisma.cnWord.findMany({
			where: { id: { in: wordChars.map((w) => w.wordId) }, status: 'published' },
		});
	}

	if (kind === 'radical') {
		const hanzi = await prisma.cnHanzi.findMany({
			where: { radical: value },
			select: { id: true },
		});
		const hanziIds = hanzi.map((h) => h.id);
		if (!hanziIds.length) return [];
		const wordChars = await prisma.cnWordChar.findMany({
			where: { hanziId: { in: hanziIds } },
			select: { wordId: true },
			distinct: ['wordId'],
			take: limit,
		});
		return prisma.cnWord.findMany({
			where: { id: { in: wordChars.map((w) => w.wordId) }, status: 'published' },
		});
	}

	return [];
}
