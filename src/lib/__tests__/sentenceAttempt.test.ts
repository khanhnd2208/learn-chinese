import { describe, expect, it } from 'vitest';
import { decideSentenceAttempt } from '@/lib/chinese/sentenceAttempt';

describe('decideSentenceAttempt', () => {
	it('retries the first miss before any hint', () => {
		expect(decideSentenceAttempt({
			correct: false,
			hintUsed: false,
			retryArmed: false,
		})).toBe('retry');
	});

	it('grades a miss once a hint was already used', () => {
		expect(decideSentenceAttempt({
			correct: false,
			hintUsed: true,
			retryArmed: false,
		})).toBe('accept');
	});

	it('grades the second miss after the retry was armed', () => {
		expect(decideSentenceAttempt({
			correct: false,
			hintUsed: true,
			retryArmed: true,
		})).toBe('accept');
		expect(decideSentenceAttempt({
			correct: false,
			hintUsed: false,
			retryArmed: true,
		})).toBe('accept');
	});

	it('grades a correct answer on the first try without a hint', () => {
		expect(decideSentenceAttempt({
			correct: true,
			hintUsed: false,
			retryArmed: false,
		})).toBe('accept');
	});

	it('grades a correct answer after a hint or a retry', () => {
		expect(decideSentenceAttempt({
			correct: true,
			hintUsed: true,
			retryArmed: false,
		})).toBe('accept');
		expect(decideSentenceAttempt({
			correct: true,
			hintUsed: true,
			retryArmed: true,
		})).toBe('accept');
	});
});
