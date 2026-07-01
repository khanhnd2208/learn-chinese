import { describe, it, expect } from 'vitest';
import { spreadByWordId } from '@/services/chinese/cnPracticeService';
import { spreadShuffle } from '@/lib/chinese/generateQuestions';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

function makeEntry(wordId: string, channel: 'meaning' | 'sound' | 'sentence' = 'meaning') {
	return {
		progress: { wordId },
		channel,
		priority: 1,
	};
}

function makeQuestion(wordId: string, idx: number): CnPracticeQuestionDTO {
	return {
		id: `${wordId}-hanzi_to_meaning-${idx}`,
		wordId,
		type: 'hanzi_to_meaning',
		prompt: 'test',
		correctAnswer: 'a',
	};
}

describe('spreadByWordId', () => {
	it('separates same word channels when alternatives exist', () => {
		const entries = [
			makeEntry('w1', 'meaning'),
			makeEntry('w1', 'sound'),
			makeEntry('w2', 'meaning'),
			makeEntry('w3', 'sound'),
		];
		const spread = spreadByWordId(entries, 1);
		for (let i = 1; i < spread.length; i++) {
			expect(spread[i].progress.wordId).not.toBe(spread[i - 1].progress.wordId);
		}
	});

	it('preserves all entries', () => {
		const entries = [
			makeEntry('w1', 'meaning'),
			makeEntry('w1', 'sound'),
			makeEntry('w2', 'meaning'),
		];
		expect(spreadByWordId(entries).length).toBe(entries.length);
	});
});

describe('spreadShuffle', () => {
	it('interleaves questions from different words', () => {
		const questions = [
			makeQuestion('w1', 0),
			makeQuestion('w1', 1),
			makeQuestion('w2', 2),
			makeQuestion('w2', 3),
			makeQuestion('w3', 4),
		];
		const spread = spreadShuffle(questions);
		expect(spread.length).toBe(questions.length);
		for (let i = 1; i < spread.length; i++) {
			expect(spread[i].wordId).not.toBe(spread[i - 1].wordId);
		}
	});

	it('preserves all questions', () => {
		const questions = [
			makeQuestion('w1', 0),
			makeQuestion('w1', 1),
			makeQuestion('w2', 2),
		];
		const spread = spreadShuffle(questions);
		expect(spread.map((q) => q.id).sort()).toEqual(questions.map((q) => q.id).sort());
	});
});
