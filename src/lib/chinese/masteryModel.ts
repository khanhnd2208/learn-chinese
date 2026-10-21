/* ════════════════════════════════════════════════════════════════════════
   masteryModel.ts — One definition of "đã nắm" (no Prisma)
   ════════════════════════════════════════════════════════════════════════ */
import { CN_CHANNEL_WEAK_THRESHOLD, CN_MASTERED_MIN_IDX } from '@/config/constants';
import type { SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import { nextStateFromInterval } from '@/lib/chinese/srsSchedule';
import { rate } from '@/lib/chinese/hanziUtils';
import type { CnWordProgressState } from '@/types/chinese';

const STATE_RANK: Record<CnWordProgressState, number> = {
	new: 0,
	learning: 1,
	weak: 2,
	familiar: 3,
	strong: 4,
	mastered: 5,
};

export interface WordLevelInput {
	state?: CnWordProgressState;
	meaningIntervalIdx: number;
	soundIntervalIdx: number;
	sentenceIntervalIdx: number;
	meaningCorrect?: number;
	meaningTotal: number;
	soundCorrect?: number;
	soundTotal: number;
	sentenceCorrect?: number;
	sentenceTotal: number;
}

/** Meaning and sound are always required. Sentence is required when the word has a fill example. */
export function requiredChannels(hasFillExample: boolean): SkillChannel[] {
	return hasFillExample ? ['meaning', 'sound', 'sentence'] : ['meaning', 'sound'];
}

function channelIdx(p: WordLevelInput, channel: SkillChannel): number {
	if (channel === 'meaning') return p.meaningIntervalIdx;
	if (channel === 'sound') return p.soundIntervalIdx;
	return p.sentenceIntervalIdx;
}

function channelTotal(p: WordLevelInput, channel: SkillChannel): number {
	if (channel === 'meaning') return p.meaningTotal;
	if (channel === 'sound') return p.soundTotal;
	return p.sentenceTotal;
}

function channelCorrect(p: WordLevelInput, channel: SkillChannel): number {
	if (channel === 'meaning') return p.meaningCorrect ?? 0;
	if (channel === 'sound') return p.soundCorrect ?? 0;
	return p.sentenceCorrect ?? 0;
}

function lowerState(a: CnWordProgressState, b: CnWordProgressState): CnWordProgressState {
	return STATE_RANK[a] < STATE_RANK[b] ? a : b;
}

export interface ProgressBucketRow extends WordLevelInput {
	wordId: string;
	introducedAt: Date | null;
}

/** Split a set into new / learning / mastered. Unintroduced and unresolved items count as new. */
export function bucketWordProgress(
	wordIds: string[],
	itemCount: number,
	rows: ProgressBucketRow[],
	wordsWithFillExamples: Set<string>,
): { newCount: number; learningCount: number; masteredCount: number; introducedCount: number } {
	const byWord = new Map(rows.map((row) => [row.wordId, row]));
	let learningCount = 0;
	let masteredCount = 0;
	let introducedCount = 0;
	for (const wordId of wordIds) {
		const row = byWord.get(wordId);
		if (!row?.introducedAt) continue;
		introducedCount++;
		if (isWordMastered(row, wordsWithFillExamples.has(wordId))) masteredCount++;
		else learningCount++;
	}
	return {
		newCount: Math.max(0, itemCount - learningCount - masteredCount),
		learningCount,
		masteredCount,
		introducedCount,
	};
}

export function isWordMastered(p: WordLevelInput, hasFillExample: boolean): boolean {
	return requiredChannels(hasFillExample).every((channel) =>
		channelTotal(p, channel) > 0 && channelIdx(p, channel) >= CN_MASTERED_MIN_IDX,
	);
}

/**
 * Lowest state among required channels.
 * A required channel with no attempts counts as learning, so one strong channel cannot mark the word mastered.
 */
export function wordLevelState(p: WordLevelInput, hasFillExample: boolean): CnWordProgressState {
	const channels = requiredChannels(hasFillExample);
	let lowest: CnWordProgressState | null = null;
	let anyPracticed = false;

	for (const channel of channels) {
		const total = channelTotal(p, channel);
		const chState = total === 0
			? 'learning'
			: nextStateFromInterval(
				channelIdx(p, channel),
				rate(channelCorrect(p, channel), total) >= CN_CHANNEL_WEAK_THRESHOLD,
			);
		if (total > 0) anyPracticed = true;
		lowest = lowest === null ? chState : lowerState(lowest, chState);
	}

	if (!anyPracticed) return p.state === 'new' || p.state === undefined ? 'new' : lowest ?? 'new';
	return lowest ?? 'learning';
}
