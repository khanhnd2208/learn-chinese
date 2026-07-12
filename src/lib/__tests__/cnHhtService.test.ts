import { describe, it, expect } from 'vitest';
import {
	applyHhtWeightDecay,
	hhtSessionStatsWhenNoQuestions,
	pickHhtWordBatch,
} from '@/services/chinese/cnHhtService';
import { HHT_MIN_WEIGHT, HHT_WEIGHT_DECAY } from '@/config/constants';

/** Deterministic RNG cycling through provided values */
function seqRng(values: number[]): () => number {
	let i = 0;
	return () => {
		const v = values[i % values.length];
		i++;
		return v;
	};
}

describe('applyHhtWeightDecay', () => {
	it('decays weight on correct answer', () => {
		expect(applyHhtWeightDecay(1, true)).toBeCloseTo(HHT_WEIGHT_DECAY);
		expect(applyHhtWeightDecay(0.2, true)).toBeCloseTo(0.2 * HHT_WEIGHT_DECAY);
	});

	it('does not change weight on wrong answer', () => {
		expect(applyHhtWeightDecay(1, false)).toBe(1);
		expect(applyHhtWeightDecay(0.5, false)).toBe(0.5);
	});

	it('floors at HHT_MIN_WEIGHT', () => {
		expect(applyHhtWeightDecay(HHT_MIN_WEIGHT, true)).toBe(HHT_MIN_WEIGHT);
		expect(applyHhtWeightDecay(HHT_MIN_WEIGHT + 0.01, true)).toBeGreaterThanOrEqual(HHT_MIN_WEIGHT);
	});
});

describe('hhtSessionStatsWhenNoQuestions', () => {
	it('returns zeros when pool is empty', () => {
		expect(hhtSessionStatsWhenNoQuestions(0, 0)).toEqual({
			totalEnrolled: 0,
			activeSetCount: 0,
			eligibleWordCount: 0,
		});
	});

	it('preserves enrolled count when pool is non-empty but no questions', () => {
		expect(hhtSessionStatsWhenNoQuestions(12, 3)).toEqual({
			totalEnrolled: 12,
			activeSetCount: 3,
			eligibleWordCount: 0,
		});
	});

	it('keeps activeSetCount from srsActive sets even without linked entries', () => {
		const stats = hhtSessionStatsWhenNoQuestions(5, 2);
		expect(stats.totalEnrolled).toBe(5);
		expect(stats.activeSetCount).toBe(2);
	});
});

describe('pickHhtWordBatch', () => {
	const entries = [
		{ setId: 'setA', wordId: 'w1' },
		{ setId: 'setA', wordId: 'w2' },
		{ setId: 'setB', wordId: 'w3' },
		{ setId: 'setB', wordId: 'w4' },
		{ setId: 'setC', wordId: 'w5' },
	];

	it('returns empty for no entries', () => {
		expect(pickHhtWordBatch([], new Map(), 5)).toEqual([]);
	});

	it('only picks wordIds from the entry pool', () => {
		const allowed = new Set(['w1', 'w2', 'w3', 'w4', 'w5']);
		const picked = pickHhtWordBatch(entries, new Map(), 10, [], seqRng([0.1, 0.2, 0.3, 0.4, 0.5]));
		for (const id of picked) {
			expect(allowed.has(id)).toBe(true);
		}
	});

	it('rotates across sets in round-robin fashion', () => {
		const weightMap = new Map(entries.map((e) => [e.wordId, 1]));
		const picked = pickHhtWordBatch(entries, weightMap, 6, [], seqRng([0, 0, 0, 0, 0, 0]));
		const setOrder: string[] = [];
		for (const wordId of picked) {
			const entry = entries.find((e) => e.wordId === wordId);
			if (entry) setOrder.push(entry.setId);
		}
		// First three picks should hit three different sets when weights are equal
		const firstThreeSets = new Set(setOrder.slice(0, 3));
		expect(firstThreeSets.size).toBe(3);
	});

	it('prefers higher-weight words within a set', () => {
		const twoEntry = [
			{ setId: 'setA', wordId: 'heavy' },
			{ setId: 'setA', wordId: 'light' },
		];
		const weightMap = new Map([['heavy', 10], ['light', 0.01]]);
		const counts = { heavy: 0, light: 0 };
		for (let i = 0; i < 20; i++) {
			const [picked] = pickHhtWordBatch(twoEntry, weightMap, 1, [], () => 0.01);
			if (picked === 'heavy') counts.heavy++;
			if (picked === 'light') counts.light++;
		}
		expect(counts.heavy).toBeGreaterThan(counts.light);
	});

	it('avoids recent wordIds when alternatives exist', () => {
		const weightMap = new Map(entries.map((e) => [e.wordId, 1]));
		const picked = pickHhtWordBatch(entries, weightMap, 3, ['w1', 'w2', 'w3'], seqRng([0, 0, 0]));
		expect(picked[0]).not.toBe('w1');
		expect(picked[0]).not.toBe('w2');
		expect(picked[0]).not.toBe('w3');
	});
});
