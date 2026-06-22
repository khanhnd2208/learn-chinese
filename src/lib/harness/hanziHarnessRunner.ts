import { validateHanziAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisValidator';
import { applyPedagogyPolicy } from '@/services/chinese/hanziAi/hanziPedagogy';
import { applyHanziTrustPolicy } from '@/services/chinese/hanziAi/hanziTrustPolicy';
import {
	HANZI_EMPTY_FACTS,
	type HanziGoldenCase,
	type HanziGoldenRunContext,
	HANZI_GOLDEN_CASES,
} from './hanziGoldenCases';

export interface HanziGoldenRunResult {
	id: string;
	term: string;
	mode: HanziGoldenCase['mode'];
	passed: boolean;
	error: string | null;
	valid: boolean;
	errorCount: number;
}

function buildContext(testCase: HanziGoldenCase): HanziGoldenRunContext {
	const draft = testCase.buildDraft();
	const facts = testCase.facts ?? HANZI_EMPTY_FACTS;
	const validated = validateHanziAnalysis(draft, testCase.term, facts);
	const trustResult = testCase.mode === 'trustPolicy' || testCase.mode === 'validate'
		? applyHanziTrustPolicy(draft, testCase.term, facts)
		: null;
	const pedagogyResult = testCase.mode === 'pedagogyPolicy'
		? applyPedagogyPolicy(draft, facts, testCase.term)
		: null;

	return { term: testCase.term, draft, facts, validated, trustResult, pedagogyResult };
}

export function runHanziGoldenCase(testCase: HanziGoldenCase): HanziGoldenRunResult {
	try {
		const ctx = buildContext(testCase);
		testCase.assert(ctx);
		return {
			id: testCase.id,
			term: testCase.term,
			mode: testCase.mode,
			passed: true,
			error: null,
			valid: ctx.validated.errors.length === 0,
			errorCount: ctx.validated.errors.length,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		const ctx = buildContext(testCase);
		return {
			id: testCase.id,
			term: testCase.term,
			mode: testCase.mode,
			passed: false,
			error: message,
			valid: ctx.validated.errors.length === 0,
			errorCount: ctx.validated.errors.length,
		};
	}
}

export function runAllHanziGoldenCases(cases: HanziGoldenCase[] = HANZI_GOLDEN_CASES): HanziGoldenRunResult[] {
	return cases.map(runHanziGoldenCase);
}

export function runHanziGoldenCaseForTest(testCase: HanziGoldenCase): HanziGoldenRunContext {
	const ctx = buildContext(testCase);
	testCase.assert(ctx);
	return ctx;
}

export function countHanziGoldenFailures(results: HanziGoldenRunResult[]): number {
	return results.filter((r) => !r.passed).length;
}
