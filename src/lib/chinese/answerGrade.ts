/* ════════════════════════════════════════════════════════════════════════
   answerGrade.ts — Client-side answer grading for practice questions
   ════════════════════════════════════════════════════════════════════════ */
import type { CnPracticeQuestionDTO } from '@/types/chinese';

export function gradeAnswer(question: CnPracticeQuestionDTO, answer: string): boolean {
	const trimmed = answer.trim();
	const correct = question.correctAnswer.trim();
	if (!trimmed) return false;

	if (
		question.type === 'meaning_to_hanzi_typed'
		|| question.type === 'sound_to_hanzi_typed'
	) {
		return trimmed === correct;
	}

	if (question.type === 'fill_sentence' || question.type === 'fill_sentence_typed') {
		return trimmed === correct;
	}

	return trimmed === correct;
}
