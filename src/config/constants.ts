import type { CnQuestionType } from '@/types/chinese';

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

/** Leitner ladder: 10m → 1d → 3d → 7d → 14d → 30d → 90d → 180d → 360d */
export const CN_SRS_INTERVALS_MINUTES = [
	10, 1440, 4320, 10080, 20160, 43200, 129600, 259200, 518400,
] as const;

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

/** Production questions (typed/recall) — only these may advance 2 ladder steps */
export const CN_PRODUCTION_QUESTION_TYPES: ReadonlySet<CnQuestionType> = new Set([
	'translate_sentence',
	'sentence_order',
]);

export const CN_PRODUCTION_STEP_CONFIDENCE = 0.9;

/** Confidence weight for SRS interval steps (higher = more impact on mastery) */
export const CN_QUESTION_CONFIDENCE: Record<CnQuestionType, number> = {
	hanzi_to_meaning: 0.6,
	meaning_to_hanzi: 0.9,
	pinyin_to_hanzi: 0.6,
	audio_to_hanzi: 0.6,
	audio_to_meaning: 0.6,
	audio_to_pinyin: 0.7,
	fill_sentence: 0.9,
	sentence_order: 0.8,
	radical_pick: 0.5,
	char_components: 0.5,
	similar_char: 0.7,
	translate_sentence: 1.0,
};
