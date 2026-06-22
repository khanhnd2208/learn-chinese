export const MAX_CN_TERMS_PER_SET = 200;
export const MAX_HANZI_LAB_TERMS = 15;
export const CN_MAX_SUBMIT_ITEMS = 200;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_IMPORT_ROWS = 500;

/** In-memory rate limits (per user, per minute) */
export const RATE_LIMIT_SUBMIT_PER_MIN = 60;
export const RATE_LIMIT_MARK_KNOWN_PER_MIN = 30;
export const RATE_LIMIT_IMPORT_PER_MIN = 10;
export const RATE_LIMIT_LOOKUP_PER_MIN = 120;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Leitner ladder: 10m → 1d → 3d → 7d → 14d → 30d → 90d → 180d → 360d */
export const CN_SRS_INTERVALS_MINUTES = [
	10, 1440, 4320, 10080, 20160, 43200, 129600, 259200, 518400,
] as const;

/** Minimum wait before re-queuing a (word, channel) pair after the first wrong answer on that channel */
export const CN_FIRST_WRONG_RETRY_MINUTES = 30;

/** listening/pinyin ramp opens when meaning interval index reaches this (1 day tier) */
export const CN_RAMP_MEANING_INTERVAL_IDX = 1;

/** Interval index thresholds for aggregate word state */
export const CN_STATE_THRESHOLDS = {
	familiar: 2,
	strong: 4,
	mastered: 6,
} as const;

/** Minimum interval index after a lapse (1 day — preserves prior memory) */
export const CN_LAPSE_FLOOR_IDX = 1;

/** Heavy lapse resets to this index */
export const CN_LAPSE_HEAVY_IDX = CN_LAPSE_FLOOR_IDX;

export const CN_DEFAULT_PRACTICE_COUNT = 20;
export const CN_DEFAULT_REVIEW_COUNT = 25;
/** Questions fetched per review batch (infinite queue) */
export const CN_REVIEW_PREFETCH_SIZE = 5;
export const CN_MAX_CHANNELS_PER_WORD_REVIEW = 2;
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const CN_CHANNEL_WEAK_THRESHOLD = 60;

/** Mark-known simulates this many correct answers */
export const CN_MARK_KNOWN_CORRECT_STEPS = 3;

/** Hide mark-known when channel intervalIdx >= this (strong) */
export const CN_MARK_KNOWN_HIDE_IDX = CN_STATE_THRESHOLDS.strong;

/** Cooldown before mark-known again on same channel (ms) */
export const CN_MARK_KNOWN_COOLDOWN_MS = 7 * 86_400_000;

/** Channel intro period: max priority score during intro */
export const CN_INTRO_PRIORITY_CAP = 300;
export const CN_INTRO_DAYS = 3;
export const CN_INTRO_MAX_TOTAL = 3;
export const CN_INTRO_RAMP_TOTAL = 10;

/** Heavy lapses before sticking-point flag */
export const CN_STICKING_POINT_HEAVY_LAPSES = 3;
