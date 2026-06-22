/* ════════════════════════════════════════════════════════════════════════
   cnSrsDueQuery.ts — SQL superset prefilter for due (word, channel) candidates
   ════════════════════════════════════════════════════════════════════════ */
import {
	CN_RAMP_MEANING_INTERVAL_IDX,
	CN_STATE_THRESHOLDS,
} from '@/config/constants';
import type { CnWordProgress } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/** Prisma where clause — superset only; JS isChannelDue is source of truth */
export function buildDueCandidateWhere(
	userId: string,
	wordIds: string[],
	now: Date,
): Prisma.CnWordProgressWhereInput {
	const familiar = CN_STATE_THRESHOLDS.familiar;
	return {
		userId,
		wordId: { in: wordIds },
		OR: [
			{ meaningTotal: 0 },
			{ meaningDueAt: { lte: now } },
			{
				AND: [
					{ listeningTotal: 0 },
					{ meaningIntervalIdx: { gte: CN_RAMP_MEANING_INTERVAL_IDX } },
				],
			},
			{
				AND: [
					{ pinyinTotal: 0 },
					{ meaningIntervalIdx: { gte: CN_RAMP_MEANING_INTERVAL_IDX } },
				],
			},
			{ listeningDueAt: { lte: now } },
			{ pinyinDueAt: { lte: now } },
			{
				AND: [
					{ meaningIntervalIdx: { gte: familiar } },
					{
						OR: [
							{ sentenceTotal: 0 },
							{ sentenceDueAt: { lte: now } },
						],
					},
				],
			},
			{ dueAt: { lte: now } },
		],
	};
}

/** Mirror of buildDueCandidateWhere OR clauses for unit tests (no Prisma) */
export function progressMatchesDueCandidateSuperset(p: CnWordProgress, now: Date): boolean {
	const familiar = CN_STATE_THRESHOLDS.familiar;
	return (
		p.meaningTotal === 0
		|| (p.meaningDueAt instanceof Date && p.meaningDueAt <= now)
		|| (p.listeningTotal === 0 && p.meaningIntervalIdx >= CN_RAMP_MEANING_INTERVAL_IDX)
		|| (p.pinyinTotal === 0 && p.meaningIntervalIdx >= CN_RAMP_MEANING_INTERVAL_IDX)
		|| (p.listeningDueAt instanceof Date && p.listeningDueAt <= now)
		|| (p.pinyinDueAt instanceof Date && p.pinyinDueAt <= now)
		|| (
			p.meaningIntervalIdx >= familiar
			&& (p.sentenceTotal === 0 || (p.sentenceDueAt instanceof Date && p.sentenceDueAt <= now))
		)
		|| p.dueAt <= now
	);
}
