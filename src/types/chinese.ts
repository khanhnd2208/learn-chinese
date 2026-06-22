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
	listeningRate: number;
	pinyinRate: number;
	sentenceRate: number;
	meaningTotal: number;
	listeningTotal: number;
	pinyinTotal: number;
	sentenceTotal: number;
	meaningIntervalIdx: number;
	listeningIntervalIdx: number;
	pinyinIntervalIdx: number;
	sentenceIntervalIdx: number;
	isStickingPoint?: boolean;
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

export interface CnWordSetDTO {
	id: string;
	title: string;
	description: string;
	source: CnWordSetSource;
	srsActive: boolean;
	itemCount: number;
	dueCount: number;
	weakCount: number;
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
	itemCount: number;
	dueCount: number;
	weakCount: number;
	createdAt: string;
	updatedAt: string;
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
	components?: string[];
	radical?: string;
	explanation?: string;
	usageNoteVi?: string;
	mnemonicVi?: string;
	/** Channel interval index */
	channelIntervalIdx?: number;
	isStickingPoint?: boolean;
}

export interface CnPracticeSubmitItem {
	wordId: string;
	questionType: CnQuestionType;
	correct: boolean;
	errorType?: CnErrorType;
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

export interface CnReviewStatsDTO {
	dueTotal: number;
	reviewedToday: number;
	correctToday: number;
	accuracyToday: number;
	remainingEstimate: number;
	weakCount: number;
	meaningRate: number;
	listeningRate: number;
	pinyinRate: number;
	sentenceRate: number;
	weakWords: Array<{ wordId: string; simplified: string; state: CnWordProgressState }>;
	recentSessions: CnReviewSessionSummaryDTO[];
}

export interface CnDashboardDTO {
	setCount: number;
	wordsLearned: number;
	wordsMastered: number;
	weakCount: number;
	dueToday: number;
	overallRate: number;
	listeningRate: number;
	pinyinRate: number;
	sentenceRate: number;
	meaningRate: number;
	topErrors: Array<{ errorType: CnErrorType; count: number }>;
	weakWords: Array<{ wordId: string; simplified: string; state: CnWordProgressState }>;
	suggestions: string[];
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
