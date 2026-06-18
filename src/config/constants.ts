import type { CnQuestionType, RecallDepth } from '@/types/chinese';

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
export const CN_DEFAULT_INTEGRATED_COUNT = 10;
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

/** Recall depth per question type */
export const CN_QUESTION_RECALL_DEPTH: Record<CnQuestionType, RecallDepth> = {
	hanzi_to_meaning: 'recognition',
	audio_to_meaning: 'recognition',
	audio_to_hanzi: 'recognition',
	pinyin_to_hanzi: 'recognition',
	radical_pick: 'recognition',
	char_components: 'recognition',
	similar_char: 'recognition',
	meaning_to_hanzi: 'cued_recall',
	fill_sentence: 'cued_recall',
	sentence_order: 'cued_recall',
	audio_to_pinyin: 'cued_recall',
	audio_to_pinyin_typed: 'cross_modal',
	hanzi_from_meaning: 'free_recall',
	translate_sentence: 'production',
};

/** @deprecated Use CN_QUESTION_RECALL_DEPTH */
export const CN_PRODUCTION_QUESTION_TYPES: ReadonlySet<CnQuestionType> = new Set([
	'translate_sentence',
	'hanzi_from_meaning',
]);

export const CN_PRODUCTION_STEP_CONFIDENCE = 0.9;

/** Confidence weight for SRS (legacy; depth drives step size) */
export const CN_QUESTION_CONFIDENCE: Record<CnQuestionType, number> = {
	hanzi_to_meaning: 0.6,
	meaning_to_hanzi: 0.9,
	pinyin_to_hanzi: 0.6,
	audio_to_hanzi: 0.6,
	audio_to_meaning: 0.6,
	audio_to_pinyin: 0.7,
	audio_to_pinyin_typed: 0.85,
	hanzi_from_meaning: 1.0,
	fill_sentence: 0.9,
	sentence_order: 0.8,
	radical_pick: 0.5,
	char_components: 0.5,
	similar_char: 0.7,
	translate_sentence: 1.0,
};

export function recallDepthAllowsDoubleStep(depth: RecallDepth): boolean {
	return depth === 'free_recall' || depth === 'production';
}
