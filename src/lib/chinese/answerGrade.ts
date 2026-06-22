/* ════════════════════════════════════════════════════════════════════════
   answerGrade.ts — Client-side answer grading for practice questions
   ════════════════════════════════════════════════════════════════════════ */
import { stageFromIntervalIdx } from '@/config/constants';
import { normalizePinyinPlain, pinyinVariantsFromCanonical } from '@/lib/chinese/pinyinNormalize';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

function normalizePinyinStrict(input: string): string {
	return pinyinVariantsFromCanonical(input.trim()).numbered.replace(/\s+/g, '');
}

function normalizePinyinAnswer(input: string, correct: string, strict: boolean): boolean {
	if (strict) {
		const userStrict = normalizePinyinStrict(input);
		const correctStrict = normalizePinyinStrict(correct);
		return userStrict === correctStrict;
	}
	return normalizePinyinPlain(input) === normalizePinyinPlain(correct);
}

export function gradeAnswer(question: CnPracticeQuestionDTO, answer: string): boolean {
	const trimmed = answer.trim();
	const correct = question.correctAnswer.trim();
	if (!trimmed) return false;

	if (question.type === 'hanzi_to_pinyin_typed') {
		const stage = stageFromIntervalIdx(question.channelIntervalIdx ?? 2);
		const strict = stage === 'maintain';
		return normalizePinyinAnswer(trimmed, correct, strict);
	}

	if (question.type === 'meaning_to_hanzi_typed' || question.type === 'audio_to_hanzi_typed') {
		return trimmed === correct;
	}

	return trimmed === correct;
}
