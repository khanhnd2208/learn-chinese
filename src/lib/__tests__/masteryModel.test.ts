import { describe, expect, it } from 'vitest';
import { isWordMastered, wordLevelState, type WordLevelInput } from '@/lib/chinese/masteryModel';

function progress(overrides: Partial<WordLevelInput> = {}): WordLevelInput {
	return {
		meaningIntervalIdx: 0,
		soundIntervalIdx: 0,
		sentenceIntervalIdx: 0,
		meaningCorrect: 0,
		meaningTotal: 0,
		soundCorrect: 0,
		soundTotal: 0,
		sentenceCorrect: 0,
		sentenceTotal: 0,
		...overrides,
	};
}

describe('masteryModel', () => {
	it('does not call a word mastered when a required channel has never been practiced', () => {
		const p = progress({
			meaningIntervalIdx: 5,
			meaningTotal: 8,
			meaningCorrect: 8,
			soundTotal: 0,
		});
		expect(isWordMastered(p, false)).toBe(false);
		expect(wordLevelState(p, false)).toBe('learning');
	});

	it('marks a word mastered only when every required channel is at least idx 3', () => {
		const ready = progress({
			meaningIntervalIdx: 3,
			meaningTotal: 4,
			meaningCorrect: 4,
			soundIntervalIdx: 4,
			soundTotal: 5,
			soundCorrect: 5,
		});
		expect(isWordMastered(ready, false)).toBe(true);
		expect(isWordMastered(ready, true)).toBe(false);
		expect(wordLevelState(ready, false)).toBe('familiar');
	});
});
