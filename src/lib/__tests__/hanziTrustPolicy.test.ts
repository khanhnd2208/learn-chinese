import { describe, it } from 'vitest';
import { HANZI_GOLDEN_CASES, runHanziGoldenCaseForTest } from '@/lib/harness';

describe('hanziTrustPolicy golden cases', () => {
	const cases = HANZI_GOLDEN_CASES.filter(
		(c) =>
			c.mode === 'trustPolicy'
			|| c.tags?.includes('trust')
			|| (c.mode === 'validate' && !c.tags?.includes('pedagogy')),
	);

	it.each(cases.map((c) => [c.id, c] as const))('golden: %s', (_id, testCase) => {
		runHanziGoldenCaseForTest(testCase);
	});
});
