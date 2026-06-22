import { describe, it } from 'vitest';
import { HANZI_GOLDEN_CASES, runHanziGoldenCaseForTest } from '@/lib/harness';

describe('hanziPedagogyValidator golden cases', () => {
	const pedagogyCases = HANZI_GOLDEN_CASES.filter(
		(c) => c.tags?.includes('pedagogy') || c.mode === 'pedagogyPolicy',
	);

	it.each(pedagogyCases.map((c) => [c.id, c] as const))('golden: %s', (_id, testCase) => {
		runHanziGoldenCaseForTest(testCase);
	});
});
