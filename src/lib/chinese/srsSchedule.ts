/* ════════════════════════════════════════════════════════════════════════
   srsSchedule.ts — Single source for the next-review formula (no Prisma)
   ════════════════════════════════════════════════════════════════════════ */
import {
	addDays,
	addMinutes,
	CN_LAPSE_RECALL_IDX,
	CN_SRS_INTERVAL_DAYS,
	CN_STATE_THRESHOLDS,
	CN_WRONG_FIRST_RETRY_MINUTES,
	clampSrsIntervalIdx,
} from '@/config/constants';
import type { CnWordProgressState } from '@/types/chinese';

export interface ComputeNextReviewOptions {
	intervalIdx: number;
	correct: boolean;
	now?: Date;
	/** Passed through from the UI. Behavior is applied in a later task. */
	hintUsed?: boolean;
}

export function nextStateFromInterval(intervalIdx: number, correct: boolean): CnWordProgressState {
	if (!correct) return 'weak';
	if (intervalIdx >= CN_STATE_THRESHOLDS.mastered) return 'mastered';
	if (intervalIdx >= CN_STATE_THRESHOLDS.strong) return 'strong';
	if (intervalIdx >= CN_STATE_THRESHOLDS.familiar) return 'familiar';
	return 'learning';
}

export function computeNextReview(options: ComputeNextReviewOptions): {
	dueAt: Date;
	intervalIdx: number;
	state: CnWordProgressState;
} {
	const {
		intervalIdx,
		correct,
		now = new Date(),
	} = options;

	const idx = clampSrsIntervalIdx(intervalIdx);

	if (!correct) {
		let nextIdx: number;
		if (idx <= 0) {
			nextIdx = 0;
		} else if (idx === 1) {
			nextIdx = 0;
		} else if (idx === 2) {
			nextIdx = 1;
		} else {
			nextIdx = CN_LAPSE_RECALL_IDX;
		}
		const dueAt = idx <= 1
			? addMinutes(now, CN_WRONG_FIRST_RETRY_MINUTES)
			: addDays(now, CN_SRS_INTERVAL_DAYS[0]);
		return {
			dueAt,
			intervalIdx: nextIdx,
			state: 'weak',
		};
	}

	const nextIdx = Math.min(idx + 1, CN_SRS_INTERVAL_DAYS.length - 1);
	return {
		dueAt: addDays(now, CN_SRS_INTERVAL_DAYS[nextIdx]),
		intervalIdx: nextIdx,
		state: nextStateFromInterval(nextIdx, true),
	};
}
