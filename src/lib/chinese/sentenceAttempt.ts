export type SentenceAttemptDecision = 'accept' | 'retry';

/**
 * First miss on a fill sentence, before any answer-revealing hint, gets one retry.
 * A later miss, or a miss after the learner already revealed the sentence, is graded.
 */
export function decideSentenceAttempt(input: {
	correct: boolean;
	hintUsed: boolean;
	retryArmed: boolean;
}): SentenceAttemptDecision {
	if (input.correct || input.hintUsed || input.retryArmed) return 'accept';
	return 'retry';
}
