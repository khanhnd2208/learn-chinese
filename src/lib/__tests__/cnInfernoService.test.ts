import { describe, it, expect } from 'vitest';
import {
	buildInfernoWordChannels,
	calcWrongPenalty,
	pickInfernoWordBatch,
	rankInfernoWords,
	splitHighLowGroups,
} from '@/services/chinese/cnInfernoService';
import type { CnWordCardDTO } from '@/types/chinese';

function makeWord(overrides: Partial<CnWordCardDTO> = {}): CnWordCardDTO {
	return {
		id: 'w1',
		simplified: '你好',
		pinyin: 'nǐ hǎo',
		hanViet: '',
		meaningVi: 'xin chào',
		partOfSpeech: '',
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published',
		examples: [],
		patterns: [],
		chars: [],
		relatedWords: [],
		...overrides,
	};
}

function makeScoreMap(entries: Array<[string, number, number?]>) {
	const map = new Map<string, { masteryScore: number; wrongCount: number }>();
	for (const [wordId, score, wrong = 0] of entries) {
		map.set(wordId, { masteryScore: score, wrongCount: wrong });
	}
	return map;
}

/** Deterministic RNG cycling through provided values */
function seqRng(values: number[]): () => number {
	let i = 0;
	return () => {
		const v = values[i % values.length];
		i++;
		return v;
	};
}

describe('buildInfernoWordChannels', () => {
	it('includes all channels for newly SRS-enrolled words (no mastered SRS stage required)', () => {
		const word = makeWord();
		const cardMap = new Map([[word.id, word]]);
		const pairs = buildInfernoWordChannels([word.id], cardMap);

		expect(pairs.length).toBeGreaterThan(0);
		expect(pairs.some((p) => p.channel === 'meaning')).toBe(true);
		expect(pairs.some((p) => p.channel === 'pinyin')).toBe(true);
		expect(pairs.some((p) => p.channel === 'listening')).toBe(true);
	});

	it('skips unpublished words missing from card map', () => {
		const pairs = buildInfernoWordChannels(['missing-id'], new Map());
		expect(pairs).toEqual([]);
	});
});

describe('calcWrongPenalty', () => {
	it('applies flat 30 at score 0', () => {
		expect(calcWrongPenalty(0)).toBe(30);
	});

	it('applies flat + 25% at score 100', () => {
		expect(calcWrongPenalty(100)).toBe(55);
	});

	it('applies flat + 25% at score 300', () => {
		expect(calcWrongPenalty(300)).toBe(105);
	});
});

describe('rankInfernoWords', () => {
	it('sorts by masteryScore DESC, then wrongCount ASC', () => {
		const scoreMap = makeScoreMap([
			['a', 100, 2],
			['b', 200, 0],
			['c', 100, 0],
			['d', 50, 0],
		]);
		const ranked = rankInfernoWords(['a', 'b', 'c', 'd'], scoreMap, () => 0.5);
		expect(ranked).toEqual(['b', 'c', 'a', 'd']);
	});
});

describe('splitHighLowGroups', () => {
	it('splits 10 words into top 3 high and bottom 7 low', () => {
		const ranked = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10'];
		const { highGroup, lowGroup } = splitHighLowGroups(ranked);
		expect(highGroup).toEqual(['w1', 'w2', 'w3']);
		expect(lowGroup).toEqual(['w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10']);
	});

	it('handles single word', () => {
		const { highGroup, lowGroup } = splitHighLowGroups(['only']);
		expect(highGroup).toEqual(['only']);
		expect(lowGroup).toEqual(['only']);
	});
});

describe('pickInfernoWordBatch', () => {
	const wordIds = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10'];
	const scoreMap = makeScoreMap([
		['w1', 500], ['w2', 400], ['w3', 300],
		['w4', 200], ['w5', 100], ['w6', 80],
		['w7', 50], ['w8', 30], ['w9', 10], ['w10', 0],
	]);

	it('picks 4 low + 1 high from 10 words', () => {
		const rng = seqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
		const batch = pickInfernoWordBatch(wordIds, scoreMap, 5, [], rng);

		expect(batch).toHaveLength(5);

		const highGroup = new Set(['w1', 'w2', 'w3']);
		const lowGroup = new Set(['w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10']);

		const highPicked = batch.filter((id) => highGroup.has(id));
		const lowPicked = batch.filter((id) => lowGroup.has(id));

		expect(lowPicked.length).toBe(4);
		expect(highPicked.length).toBe(1);
	});

	it('avoids recent wordIds in low group when enough alternatives exist', () => {
		const recent = ['w4', 'w5', 'w6'];
		const rng = seqRng(Array.from({ length: 20 }, (_, i) => i * 0.05));
		const batch = pickInfernoWordBatch(wordIds, scoreMap, 5, recent, rng);

		const lowPicked = batch.filter((id) => !['w1', 'w2', 'w3'].includes(id));
		for (const id of lowPicked) {
			expect(recent).not.toContain(id);
		}
		expect(lowPicked.length).toBe(4);
	});

	it('avoids recent wordIds in high slot when alternatives exist', () => {
		const recent = ['w1', 'w2'];
		const rng = seqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
		const batch = pickInfernoWordBatch(wordIds, scoreMap, 5, recent, rng);

		const highPicked = batch.filter((id) => ['w1', 'w2', 'w3'].includes(id));
		expect(highPicked).toHaveLength(1);
		expect(highPicked[0]).toBe('w3');
	});

	it('falls back when all low words are recent', () => {
		const recent = ['w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10'];
		const rng = seqRng([0.5]);
		const batch = pickInfernoWordBatch(wordIds, scoreMap, 5, recent, rng);
		expect(batch.length).toBeGreaterThan(0);
	});

	it('returns all available words when pool is smaller than limit', () => {
		const smallIds = ['a', 'b', 'c'];
		const smallMap = makeScoreMap([['a', 100], ['b', 50], ['c', 0]]);
		const batch = pickInfernoWordBatch(smallIds, smallMap, 5, [], () => 0.5);
		expect(batch.length).toBeLessThanOrEqual(3);
		expect(batch.length).toBeGreaterThan(0);
	});

	it('does not return duplicate wordIds in one batch', () => {
		const rng = seqRng(Array.from({ length: 20 }, (_, i) => i * 0.04));
		const batch = pickInfernoWordBatch(wordIds, scoreMap, 5, [], rng);
		expect(new Set(batch).size).toBe(batch.length);
	});
});
