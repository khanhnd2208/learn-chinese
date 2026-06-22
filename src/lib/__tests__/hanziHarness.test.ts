import { describe, expect, it } from 'vitest';
import {
	HANZI_GOLDEN_CASES,
	countHanziGoldenFailures,
	getHanziGoldenCaseIds,
	runAllHanziGoldenCases,
} from '@/lib/harness';

describe('hanzi harness registry', () => {
	it('has golden cases', () => {
		expect(HANZI_GOLDEN_CASES.length).toBeGreaterThan(0);
	});

	it('has unique case ids', () => {
		const ids = getHanziGoldenCaseIds();
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('all golden cases pass offline', () => {
		const results = runAllHanziGoldenCases();
		expect(countHanziGoldenFailures(results)).toBe(0);
	});
});
