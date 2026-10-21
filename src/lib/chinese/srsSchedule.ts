/* ════════════════════════════════════════════════════════════════════════
   srsSchedule.ts — Chinese wrapper around the shared review formula
   ════════════════════════════════════════════════════════════════════════ */
import { SRS_LADDER, computeNextReviewStep, nextStateFromInterval as nextSharedState } from '@/lib/srs/schedule';
import type { CnWordProgressState } from '@/types/chinese';

export interface ComputeNextReviewOptions {
	intervalIdx: number;
	correct: boolean;
	now?: Date;
	/** Passed through from the UI. Behavior is applied in a later task. */
	hintUsed?: boolean;
}

export function nextStateFromInterval(intervalIdx: number, correct: boolean): CnWordProgressState {
	return nextSharedState(intervalIdx, correct, SRS_LADDER.stateThresholds);
}

export function computeNextReview(options: ComputeNextReviewOptions): {
	dueAt: Date;
	intervalIdx: number;
	state: CnWordProgressState;
} {
	return computeNextReviewStep({
		...options,
		ladder: SRS_LADDER,
	});
}
