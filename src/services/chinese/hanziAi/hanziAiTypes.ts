import type { HanziAnalysisResult } from './hanziAnalysisSchema';

export type FactTrust = 'unverified' | 'system_checked' | 'expert_verified';

export interface TrustedFact<T> {
	value: T;
	trust: FactTrust;
}

export interface HanziKnownFacts {
	termLevel: {
		pinyinInContext?: TrustedFact<string>;
		hanViet?: TrustedFact<string>;
		meaningVi?: TrustedFact<string>;
		wordClasses?: TrustedFact<string[]>;
	};
	characterLevel: Array<{
		char: string;
		position: number;
		dictionaryReadings?: TrustedFact<string[]>;
		hanViet?: TrustedFact<string>;
		meaningVi?: TrustedFact<string>;
		radical?: TrustedFact<string>;
		components?: TrustedFact<string[]>;
	}>;
}

export interface HanziAiGenerationResult {
	rawText: string;
	parsedJson: unknown;
	provider: string;
	model: string;
	inputTokens: number | null;
	outputTokens: number | null;
	latencyMs: number;
	requestId: string | null;
}

export interface HanziAiProvider {
	generateAnalysis(input: {
		term: string;
		knownFacts: HanziKnownFacts;
		repairErrors?: string[];
		signal: AbortSignal;
	}): Promise<HanziAiGenerationResult>;
}

export type HanziPartLexiconSource = 'database' | 'radical_meta' | 'ai_hint';

export interface HanziPartLexiconEntry {
	pinyin: string | null;
	hanViet: string | null;
	meaningVi: string | null;
	source: HanziPartLexiconSource;
}

export type HanziPartLexicon = Record<string, HanziPartLexiconEntry>;

export interface HanziAiPublicAnalysis {
	id: string;
	status: 'ready' | 'empty' | 'generating' | 'needs_review' | 'blocked' | 'stale' | 'failed';
	analysis: HanziAnalysisResult | null;
	contentVersion: number;
	openReportCount: number;
	factsSoftStale?: boolean;
	promptVersion?: string | null;
	legacyPrompt?: boolean;
	pedagogyReviewPending?: boolean;
	decompositionLimited?: boolean;
	partLexicon?: HanziPartLexicon;
}

