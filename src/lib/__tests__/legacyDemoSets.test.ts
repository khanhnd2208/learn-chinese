import { describe, it, expect } from 'vitest';
import {
	isLegacyDemoSet,
	LEGACY_AUTO_SEED_DESCRIPTION,
	LEGACY_DEMO_SET_TITLES,
} from '@/lib/chinese/legacyDemoSets';

describe('isLegacyDemoSet', () => {
	it('matches old auto-seed buổi titles', () => {
		for (const title of LEGACY_DEMO_SET_TITLES) {
			expect(isLegacyDemoSet({ title, description: '', source: 'manual' })).toBe(true);
		}
	});

	it('matches textbook auto-seed by description', () => {
		expect(isLegacyDemoSet({
			title: 'HSK1 Bài 1 - 你好',
			description: LEGACY_AUTO_SEED_DESCRIPTION,
			source: 'textbook',
		})).toBe(true);
	});

	it('does not match real Excel import (manual, empty description)', () => {
		expect(isLegacyDemoSet({
			title: 'HSK1 Bài 1 - 你好',
			description: '',
			source: 'manual',
		})).toBe(false);
	});
});
