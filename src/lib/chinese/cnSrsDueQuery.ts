/* ════════════════════════════════════════════════════════════════════════
   cnSrsDueQuery.ts — SQL superset prefilter for due (word, channel) candidates
   ════════════════════════════════════════════════════════════════════════ */
import type { CnWordProgress } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/** Prisma where clause — superset only; JS isChannelDue is source of truth */
export function buildDueCandidateWhere(
	userId: string,
	wordIds: string[],
	now: Date,
): Prisma.CnWordProgressWhereInput {
	return {
		userId,
		wordId: { in: wordIds },
		OR: [
			{ meaningTotal: 0 },
			{ meaningDueAt: { lte: now } },
			{ listeningTotal: 0 },
			{ listeningDueAt: { lte: now } },
			{ pinyinTotal: 0 },
			{ pinyinDueAt: { lte: now } },
			{ sentenceTotal: 0 },
			{ sentenceDueAt: { lte: now } },
			{ dueAt: { lte: now } },
		],
	};
}

/** Mirror of buildDueCandidateWhere OR clauses for unit tests (no Prisma) */
export function progressMatchesDueCandidateSuperset(p: CnWordProgress, now: Date): boolean {
	return (
		p.meaningTotal === 0
		|| (p.meaningDueAt instanceof Date && p.meaningDueAt <= now)
		|| p.listeningTotal === 0
		|| (p.listeningDueAt instanceof Date && p.listeningDueAt <= now)
		|| p.pinyinTotal === 0
		|| (p.pinyinDueAt instanceof Date && p.pinyinDueAt <= now)
		|| p.sentenceTotal === 0
		|| (p.sentenceDueAt instanceof Date && p.sentenceDueAt <= now)
		|| p.dueAt <= now
	);
}
