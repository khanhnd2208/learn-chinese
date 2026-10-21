/* ════════════════════════════════════════════════════════════════════════
   Chinese Vocabulary Types — API DTOs
   ════════════════════════════════════════════════════════════════════════ */

export type CnContentStatus = 'draft' | 'published';
export type CnWordSetSource = 'manual' | 'hsk' | 'textbook';
export type CnWordProgressState =
	| 'new'
	| 'learning'
	| 'weak'
	| 'familiar'
	| 'strong'
	| 'mastered';

export type CnLookupStatus = 'full' | 'charsOnly' | 'none';

import type { CoreQuestionType, SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import type { CnSrsStage } from '@/config/constants';

export type { CoreQuestionType, SkillChannel, CnSrsStage };

/** Active practice/SRS question types (MVP core set) */
export type CnQuestionType = CoreQuestionType;

export type CnErrorType =
	| 'sai_nghia'
	| 'sai_pinyin'
	| 'sai_thanh_dieu'
	| 'nghe_khong_ra'
	| 'nham_chu'
	| 'quen_hanzi'
	| 'sai_mau_cau'
	| 'sai_vi_tri'
	| 'qua_han';

export interface CnHanziDTO {
	id: string;
	char: string;
	pinyin: string;
	hanViet: string;
	meaningVi: string;
	components: string[];
	radical: string;
	mnemonicVi: string;
	similarGroupId: string | null;
	componentAnalysisStatus?: string;
	status: CnContentStatus;
}

export interface CnSimilarGroupDTO {
	id: string;
	key: string;
	note: string;
	confusionType?: string | null;
	explanationVi?: string;
	difficultyLevel?: string | null;
	minimalDifferenceNote?: string;
	hanzi: CnHanziDTO[];
}

export interface CnExampleDTO {
	id: string;
	hanzi: string;
	pinyin: string;
	meaningVi: string;
	meaningViTemplate?: string;
	targetWordStart?: number | null;
	targetWordEnd?: number | null;
	naturalnessStatus?: string;
}

export interface CnSentencePatternDTO {
	id: string;
	template: string;
	samples: Array<{ hanzi: string; pinyin: string; meaningVi: string }>;
}

export interface CnWordDTO {
	id: string;
	simplified: string;
	pinyin: string;
	hanViet: string;
	meaningVi: string;
	partOfSpeech: string;
	mnemonicVi: string;
	usageNoteVi?: string;
	ghiChu?: string;
	hskLevel: number | null;
	pinyinPlain?: string;
	pinyinNumbered?: string;
	pinyinSyllables?: string[];
	tones?: number[];
	frequencyRank?: number | null;
	difficultyLevel?: string | null;
	isFunctionWord?: boolean;
	learningPriority?: number | null;
	status: CnContentStatus;
}

export interface CnWordProgressDTO {
	wordId: string;
	state: CnWordProgressState;
	dueAt: string;
	intervalIdx: number;
	lastReviewedAt: string | null;
	meaningRate: number;
	soundRate: number;
	sentenceRate: number;
	meaningTotal: number;
	soundTotal: number;
	sentenceTotal: number;
	meaningIntervalIdx: number;
	soundIntervalIdx: number;
	sentenceIntervalIdx: number;
	isStickingPoint?: boolean;
	lastExampleId?: string | null;
}

export interface CnChannelMasteryDTO {
	channel: SkillChannel;
	rate: number;
	total: number;
	level: 'not_practiced' | 'weak' | 'ok' | 'good';
	label: string;
}

export interface CnWordCardDTO extends CnWordDTO {
	examples: CnExampleDTO[];
	patterns: CnSentencePatternDTO[];
	chars: Array<CnHanziDTO & { position: number }>;
	relatedWords: CnWordDTO[];
	progress?: CnWordProgressDTO | null;
	channelMastery?: CnChannelMasteryDTO[];
}

export interface CnLookupResultDTO {
	term: string;
	status: CnLookupStatus;
	word: CnWordDTO | null;
	chars: CnHanziDTO[];
	hasPinyin: boolean;
	hasMeaning: boolean;
	hasAudio: boolean;
	hasCharAnalysis: boolean;
	hasExample: boolean;
	hasPattern: boolean;
	supportsSentence: boolean;
}

export interface CnCoverageReportDTO {
	total: number;
	inDatabase: number;
	hasPinyin: number;
	hasMeaning: number;
	hasAudio: number;
	hasCharAnalysis: number;
	hasExample: number;
	hasPattern: number;
	supportsSentence: number;
	pending: string[];
}

export interface CnWordSetItemDTO {
	id: string;
	rawTerm: string;
	wordId: string | null;
	word: CnWordDTO | null;
	progressState: CnWordProgressState | null;
}

export interface CnSharedWordSetDTO {
	id: string;
	title: string;
	description: string;
	itemCount: number;
	updatedAt: string;
}

export interface CnWordSetDTO {
	id: string;
	title: string;
	description: string;
	source: CnWordSetSource;
	/** Viewer's review switch. Comes from CnSetEnrollment, not the set row. */
	srsActive: boolean;
	/** Published to Khám phá. */
	shared: boolean;
	level: number | null;
	sortOrder: number;
	/** Learner-owned set that was not matched to a published original. */
	legacy: boolean;
	enrolled: boolean;
	itemCount: number;
	dueCount: number;
	weakCount: number;
	introducedCount: number;
	masteredCount: number;
	newCount: number;
	learningCount: number;
	items: CnWordSetItemDTO[];
	createdAt: string;
	updatedAt: string;
}

export interface CnWordSetListItemDTO {
	id: string;
	title: string;
	description: string;
	source: CnWordSetSource;
	srsActive: boolean;
	shared: boolean;
	level: number | null;
	sortOrder: number;
	legacy: boolean;
	enrolled: boolean;
	learnerCount: number;
	itemCount: number;
	dueCount: number;
	weakCount: number;
	introducedCount: number;
	masteredCount: number;
	newCount: number;
	learningCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface FlashcardExampleDTO {
	id: string;
	hanzi: string;
	pinyin: string;
	meaningVi: string;
	targetWordStart: number | null;
	targetWordEnd: number | null;
}

export interface FlashcardCardDTO {
	id: string;
	itemId: string;
	simplified: string;
	pinyin: string;
	meaningVi: string;
	examples: FlashcardExampleDTO[];
}

export interface FlashcardDeckDTO {
	setId: string;
	title: string;
	cards: FlashcardCardDTO[];
	skippedCount: number;
}

export interface CnPracticeQuestionDTO {
	id: string;
	wordId: string;
	type: CnQuestionType;
	prompt: string;
	audioText?: string;
	options?: string[];
	correctAnswer: string;
	hanzi?: string;
	pinyin?: string;
	meaningVi?: string;
	sentenceTemplate?: string;
	sentenceMeaningVi?: string;
	components?: string[];
	radical?: string;
	explanation?: string;
	usageNoteVi?: string;
	mnemonicVi?: string;
	/** Channel interval index */
	channelIntervalIdx?: number;
	isStickingPoint?: boolean;
	/** CnExample id used for fill_sentence questions */
	exampleId?: string;
	/** Word-level pinyin for fill_sentence reveal (distinct from sentence pinyin) */
	wordPinyin?: string;
}

export interface CnPracticeSubmitItem {
	wordId: string;
	questionType: CnQuestionType;
	correct: boolean;
	errorType?: CnErrorType;
	exampleId?: string;
	/** Learner opened a hint before answering. A correct answer then does not promote. */
	hintUsed?: boolean;
	/** Milliseconds from question display to the answer. */
	responseMs?: number;
	/** Text the learner chose or typed. Missing only for a tab opened before server grading. */
	answer?: string;
	/** One id per answer, so a retried request is not counted twice. */
	clientAnswerId?: string;
}

export interface CnPracticeSessionResultDTO {
	total: number;
	correct: number;
	byType: Record<string, { correct: number; total: number }>;
	weakWords: string[];
	stickingPointWords?: string[];
}

export interface CnReviewSessionSummaryDTO {
	startedAt: string;
	endedAt: string;
	itemCount: number;
	correctCount: number;
	accuracy: number;
}

export interface CnReviewForecastDayDTO {
	dayKey: string;
	label: string;
	dueCount: number;
	overdueCount: number;
}

export interface CnUpcomingSlotDTO {
	key: string;
	label: string;
	count: number;
	overdueCount?: number;
}

export interface CnReviewDailyActivityDTO {
	dayKey: string;
	reviewed: number;
	correct: number;
}

export interface CnReviewStateDistributionDTO {
	new: number;
	learning: number;
	weak: number;
	familiar: number;
	strong: number;
	mastered: number;
	total: number;
}

export interface CnReviewStatsDTO {
	dueTotal: number;
	overdueCount: number;
	reviewedToday: number;
	correctToday: number;
	accuracyToday: number;
	remainingEstimate: number;
	weakCount: number;
	meaningRate: number;
	soundRate: number;
	sentenceRate: number;
	recallAccuracy: number;
	recallTotal: number;
	mcqAccuracy: number;
	mcqTotal: number;
	streak: number;
	bestStreak: number;
	avgPerDay7: number;
	avgPerDay30: number;
	maturePct: number;
	stateDistribution: CnReviewStateDistributionDTO;
	forecast: CnReviewForecastDayDTO[];
	dailySeries: CnReviewDailyActivityDTO[];
	nextDueAt: string | null;
	nextDueLabel: string | null;
	insights: string[];
	hasActiveWords: boolean;
	weakWords: Array<{ wordId: string; simplified: string; state: CnWordProgressState }>;
	topErrors: Array<{ errorType: CnErrorType; count: number }>;
	recentSessions: CnReviewSessionSummaryDTO[];
}

export interface CnReviewStatusDTO {
	dueTotal: number;
	overdueCount: number;
	streak: number;
	pressure: 'none' | 'mild' | 'moderate' | 'severe';
}

export interface CnReviewBriefingDTO {
	/** Unique words with ≥1 due channel today */
	dueWords: number;
	/** Due (word, channel) pairs — equals question count in review */
	dueChannels: number;
	overdueCount: number;
	pressure: 'none' | 'mild' | 'moderate' | 'severe';
	streak: number;
	reviewedToday: number;
	accuracyToday: number;
	maturePct: number;
	estimatedMinutes: number;
	hasActiveWords: boolean;
	insight: string;
}

export interface CnDashboardDTO {
	setCount: number;
	wordsLearned: number;
	wordsMastered: number;
	weakCount: number;
	/** Unique words with ≥1 due channel today */
	dueWordsToday: number;
	/** Due (word, channel) pairs — equals question count in review */
	dueChannelsToday: number;
	overdueCount: number;
	forecast: CnReviewForecastDayDTO[];
	upcomingSchedule: CnUpcomingSlotDTO[];
	nextDueAt: string | null;
	nextDueLabel: string | null;
	reviewedToday: number;
	stateDistribution: CnReviewStateDistributionDTO;
	maturePct: number;
	streak: number;
	dailySeries: CnReviewDailyActivityDTO[];
	overallRate: number;
	soundRate: number;
	sentenceRate: number;
	meaningRate: number;
	topErrors: Array<{ errorType: CnErrorType; count: number }>;
	weakWords: Array<{ wordId: string; simplified: string; state: CnWordProgressState }>;
}

export interface CnInfernoMasteryDeltaDTO {
	wordId: string;
	delta: number;
	newScore: number;
}

export interface CnInfernoScoreBucketDTO {
	label: string;
	count: number;
}

export interface CnInfernoWordRankDTO {
	wordId: string;
	simplified: string;
	meaningVi: string;
	masteryScore: number;
}

export interface CnInfernoStatsDTO {
	totalEnrolled: number;
	masteredCount: number;
	avgMasteryScore: number;
	totalMasteryPoints: number;
	totalAnswered: number;
	overallAccuracy: number;
	mcqAccuracy: number;
	mcqTotal: number;
	fillAccuracy: number;
	fillTotal: number;
	scoreDistribution: CnInfernoScoreBucketDTO[];
	topMastered: CnInfernoWordRankDTO[];
	stuckAtZero: CnInfernoWordRankDTO[];
	wordsWithProgress: number;
	insights: string[];
}

export interface CnAdminSourceBreakdownDTO {
	review: number;
	practice: number;
	inferno: number;
	other: number;
}

export interface CnAdminUserActivityDTO {
	userId: string;
	name: string;
	email: string;
	answers7d: number;
	answers30d: number;
	activeDays7d: number;
	activeDays30d: number;
	streak: number;
	lastActiveAt: string | null;
	sessions7d: number;
	avgItemsPerSession: number;
	accuracy30d: number;
	sourceBreakdown: CnAdminSourceBreakdownDTO;
}

export interface CnAdminAnalyticsDTO {
	activeToday: number;
	active7d: number;
	active30d: number;
	totalAnswers7d: number;
	totalAnswers30d: number;
	sourceBreakdown: CnAdminSourceBreakdownDTO;
	dailySeries: CnReviewDailyActivityDTO[];
	users: CnAdminUserActivityDTO[];
}

export interface CreateCnWordSetInput {
	title: string;
	description?: string;
	source?: CnWordSetSource;
	terms: string[];
	srsActive?: boolean;
}

export interface CnHanziAnalysisDTO {
	term: string;
	status: CnLookupStatus;
	word: CnWordCardDTO | null;
	chars: Array<CnHanziDTO & { position: number }>;
	similarGroup: CnSimilarGroupDTO | null;
	mnemonicOverall: string;
}
