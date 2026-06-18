import { describe, expect, it } from 'vitest';
import { parseHanziRevisionResult } from '@/services/chinese/hanziAi/hanziSchemaRegistry';

describe('Hanzi AI revision as single source of truth', () => {
	it('rejects invalid provider JSON without creating a readable revision', () => {
		expect(parseHanziRevisionResult({ foo: 'bar' }, 1).ok).toBe(false);
		expect(parseHanziRevisionResult(null, 1).ok).toBe(false);
	});
});
