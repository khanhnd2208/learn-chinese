import { describe, expect, it } from 'vitest';
import { firstAttemptPerUser, scoreExample, type ExampleAttempt } from '@/lib/chinese/exampleQuality';

function attempt(userId: string, createdAt: string, correct: boolean, hintUsed = false, answer: string | null = null): ExampleAttempt {
	return { userId, createdAt: new Date(createdAt), correct, hintUsed, answer };
}

describe('scoreExample', () => {
	it('counts only the first attempt from each learner', () => {
		const rows = [
			attempt('u1', '2026-10-01T00:00:00Z', false, false, '已'),
			attempt('u1', '2026-10-02T00:00:00Z', true),
			attempt('u2', '2026-10-03T00:00:00Z', true),
		];
		expect(firstAttemptPerUser(rows).map((row) => row.userId).sort()).toEqual(['u1', 'u2']);
		expect(scoreExample(rows, []).attempts).toBe(2);
		expect(scoreExample(rows, []).cleanRate).toBe(0.5);
	});

	it('flags a sentence once eight learners have a clean rate under 40%', () => {
		const rows = [
			...Array.from({ length: 6 }, (_, i) => attempt(`wrong-${i}`, `2026-10-0${i + 1}T00:00:00Z`, false)),
			attempt('ok-1', '2026-10-07T00:00:00Z', true),
			attempt('ok-2', '2026-10-08T00:00:00Z', true),
		];
		const score = scoreExample(rows, []);
		expect(score.attempts).toBe(8);
		expect(score.cleanRate).toBe(0.25);
		expect(score.flagged).toBe(true);
	});

	it('does not flag a sentence with too little evidence', () => {
		const rows = Array.from({ length: 7 }, (_, i) => attempt(`u${i}`, `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`, false));
		expect(scoreExample(rows, []).flagged).toBe(false);
	});

	it('flags a sentence when three different learners dispute it', () => {
		const score = scoreExample([attempt('u1', '2026-10-01T00:00:00Z', true)], ['a', 'b', 'c']);
		expect(score.attempts).toBe(1);
		expect(score.disputeUsers).toBe(3);
		expect(score.flagged).toBe(true);
	});
});
