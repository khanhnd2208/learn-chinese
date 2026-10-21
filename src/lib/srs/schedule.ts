import {
	addDays,
	addMinutes,
	CN_LAPSE_RECALL_IDX,
	CN_SRS_INTERVAL_DAYS,
	CN_STATE_THRESHOLDS,
	CN_WRONG_FIRST_RETRY_MINUTES,
} from '@/config/constants';

export type SrsProgressState = 'new' | 'learning' | 'weak' | 'familiar' | 'strong' | 'mastered';

export interface SrsLadder {
	intervalDays: readonly number[];
	lapseRecallIdx: number;
	wrongFirstRetryMinutes: number;
	hintHoldDays: number;
	stateThresholds: {
		familiar: number;
		strong: number;
		mastered: number;
	};
}

/** Shared Leitner ladder. Chinese and English both step through this formula. */
export const SRS_LADDER: SrsLadder = {
	intervalDays: CN_SRS_INTERVAL_DAYS,
	lapseRecallIdx: CN_LAPSE_RECALL_IDX,
	wrongFirstRetryMinutes: CN_WRONG_FIRST_RETRY_MINUTES,
	hintHoldDays: 1,
	stateThresholds: CN_STATE_THRESHOLDS,
};

export function clampIntervalIdx(idx: number, ladderLength: number): number {
	if (ladderLength <= 0) return 0;
	return Math.min(Math.max(idx, 0), ladderLength - 1);
}

export function nextStateFromInterval(
	intervalIdx: number,
	correct: boolean,
	thresholds: SrsLadder['stateThresholds'],
): SrsProgressState {
	if (!correct) return 'weak';
	if (intervalIdx >= thresholds.mastered) return 'mastered';
	if (intervalIdx >= thresholds.strong) return 'strong';
	if (intervalIdx >= thresholds.familiar) return 'familiar';
	return 'learning';
}

export function computeNextReviewStep(options: {
	intervalIdx: number;
	correct: boolean;
	now?: Date;
	hintUsed?: boolean;
	ladder: SrsLadder;
}): {
	dueAt: Date;
	intervalIdx: number;
	state: SrsProgressState;
} {
	const {
		intervalIdx,
		correct,
		now = new Date(),
		hintUsed = false,
		ladder,
	} = options;
	const idx = clampIntervalIdx(intervalIdx, ladder.intervalDays.length);

	if (correct && hintUsed) {
		return {
			dueAt: addDays(now, ladder.hintHoldDays),
			intervalIdx: idx,
			state: nextStateFromInterval(idx, true, ladder.stateThresholds),
		};
	}

	if (!correct) {
		let nextIdx: number;
		if (idx <= 0) nextIdx = 0;
		else if (idx === 1) nextIdx = 0;
		else if (idx === 2) nextIdx = 1;
		else nextIdx = ladder.lapseRecallIdx;
		const dueAt = idx <= 1
			? addMinutes(now, ladder.wrongFirstRetryMinutes)
			: addDays(now, ladder.intervalDays[0] ?? 1);
		return {
			dueAt,
			intervalIdx: nextIdx,
			state: 'weak',
		};
	}

	const nextIdx = Math.min(idx + 1, ladder.intervalDays.length - 1);
	return {
		dueAt: addDays(now, ladder.intervalDays[nextIdx] ?? 1),
		intervalIdx: nextIdx,
		state: nextStateFromInterval(nextIdx, true, ladder.stateThresholds),
	};
}
