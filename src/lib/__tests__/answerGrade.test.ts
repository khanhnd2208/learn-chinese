import { describe, expect, it } from 'vitest';
import { expectedAnswerFor, gradeAnswer, gradeAnswerText, gradeSentenceAnswer } from '@/lib/chinese/answerGrade';
import type { CnPracticeQuestionDTO } from '@/types/chinese';

describe('answerGrade', () => {
	it('expects the Vietnamese gloss only for hanzi-to-meaning', () => {
		const word = { simplified: '学生', meaningVi: 'học sinh' };
		expect(expectedAnswerFor('hanzi_to_meaning', word)).toBe('học sinh');
		expect(expectedAnswerFor('meaning_to_hanzi_typed', word)).toBe('学生');
	});

	it('matches after trim, unicode normalization, and spaces between Han characters', () => {
		expect(gradeAnswerText('meaning_to_hanzi_typed', '学生', ' 学 生 ')).toBe(true);
		expect(gradeAnswerText('hanzi_to_meaning', 'học sinh', 'học sinh')).toBe(true);
		expect(gradeAnswerText('hanzi_to_meaning', 'học sinh', 'sinh viên')).toBe(false);
	});

	it('grades a question with the same text rules', () => {
		const question = {
			type: 'sound_to_hanzi_typed',
			correctAnswer: '学习',
		} as CnPracticeQuestionDTO;
		expect(gradeAnswer(question, '学 习')).toBe(true);
	});

	it('accepts another answer stored for the same sentence', () => {
		const question = {
			type: 'fill_sentence_typed',
			correctAnswer: '学生',
			acceptedAnswers: ['已'],
		} as CnPracticeQuestionDTO;
		expect(gradeAnswer(question, '已')).toBe(true);
		expect(gradeAnswer(question, '老师')).toBe(false);
		expect(gradeSentenceAnswer('学生', ['已'], ' 已 ')).toBe(true);
	});
});
