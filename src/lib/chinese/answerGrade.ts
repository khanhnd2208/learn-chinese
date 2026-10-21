/* ════════════════════════════════════════════════════════════════════════
   answerGrade.ts — Shared answer grading for the client and the server
   ════════════════════════════════════════════════════════════════════════ */
import type { CnPracticeQuestionDTO, CnQuestionType } from '@/types/chinese';

const HAN_GAP = /([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu;

export function expectedAnswerFor(
	type: CnQuestionType,
	word: { simplified: string; meaningVi: string },
): string {
	return type === 'hanzi_to_meaning' ? word.meaningVi : word.simplified;
}

export function normalizeGradedText(value: string): string {
	return value.normalize('NFC').trim().replace(HAN_GAP, '$1');
}

export function gradeAnswerText(_type: CnQuestionType, expected: string, answer: string): boolean {
	const given = normalizeGradedText(answer);
	if (!given) return false;
	return given === normalizeGradedText(expected);
}

export function gradeAnswer(question: CnPracticeQuestionDTO, answer: string): boolean {
	return gradeAnswerText(question.type, question.correctAnswer, answer);
}
