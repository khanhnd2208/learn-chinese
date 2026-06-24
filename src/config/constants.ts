export const MAX_CN_TERMS_PER_SET = 200;
export const MAX_HANZI_LAB_TERMS = 15;
export const CN_MAX_SUBMIT_ITEMS = 200;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_IMPORT_ROWS = 500;

/** In-memory rate limits (per user, per minute) */
export const RATE_LIMIT_SUBMIT_PER_MIN = 60;
export const RATE_LIMIT_IMPORT_PER_MIN = 10;
export const RATE_LIMIT_LOOKUP_PER_MIN = 120;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * SRS ladder per channel (days until next review after a correct answer at that index).
 * 0 = MCQ1, 1 = MCQ2, 2 = Recall typed, 3–5 = Maintain typed (7 / 14 / 30 days).
 */
export const CN_SRS_INTERVAL_DAYS = [1, 1, 3, 7, 14, 30] as const;

export type CnSrsStage = 'mcq1' | 'mcq2' | 'recall' | 'maintain';

/** Interval index thresholds for aggregate word state */
export const CN_STATE_THRESHOLDS = {
	familiar: 2,
	strong: 4,
	mastered: 5,
} as const;

/** Heavy lapse on maintain regresses to MCQ2 */
export const CN_LAPSE_HEAVY_IDX = 1;

/** Light lapse on maintain regresses to Recall */
export const CN_LAPSE_RECALL_IDX = 2;

export const CN_DEFAULT_PRACTICE_COUNT = 20;
export const CN_DEFAULT_REVIEW_COUNT = 25;
/** Questions fetched per review batch (infinite queue) */
export const CN_REVIEW_PREFETCH_SIZE = 5;
export const CN_MAX_CHANNELS_PER_WORD_REVIEW = 3;
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const CN_CHANNEL_WEAK_THRESHOLD = 60;

/** Heavy lapses before sticking-point flag */
export const CN_STICKING_POINT_HEAVY_LAPSES = 3;

/** MCQ1/MCQ2 wrong answer: retry after this many minutes */
export const CN_WRONG_FIRST_RETRY_MINUTES = 30;

export function clampSrsIntervalIdx(idx: number): number {
	return Math.min(Math.max(idx, 0), CN_SRS_INTERVAL_DAYS.length - 1);
}

export function stageFromIntervalIdx(idx: number): CnSrsStage {
	const clamped = clampSrsIntervalIdx(idx);
	if (clamped <= 0) return 'mcq1';
	if (clamped === 1) return 'mcq2';
	if (clamped === 2) return 'recall';
	return 'maintain';
}

export function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 86_400_000);
}

export function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60_000);
}
