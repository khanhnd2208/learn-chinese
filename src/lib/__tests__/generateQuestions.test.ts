import { describe, it, expect } from 'vitest';
import { generatePracticeSession, generateQuestionForWord } from '@/lib/chinese/generateQuestions';
import { CORE_QUESTION_TYPES } from '@/lib/chinese/coreQuestionTypes';
import type { CnWordCardDTO } from '@/types/chinese';

const verifiedExample = {
	id: 'e1',
	hanzi: '我是学生。',
	pinyin: 'Wǒ shì xuésheng.',
	meaningVi: 'Tôi là học sinh.',
	targetWordStart: 2,
	targetWordEnd: 4,
	naturalnessStatus: 'verified',
};

const sampleWords: CnWordCardDTO[] = [
	{
		id: 'w1',
		simplified: '学生',
		pinyin: 'xuésheng',
		hanViet: 'HỌC SINH',
		meaningVi: 'học sinh',
		partOfSpeech: 'danh từ',
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published',
		examples: [verifiedExample],
		patterns: [],
		chars: [
			{ id: 'h1', char: '学', pinyin: 'xué', hanViet: 'HỌC', meaningVi: 'học', components: [], radical: '子', mnemonicVi: '', similarGroupId: null, status: 'published', position: 0 },
			{ id: 'h2', char: '生', pinyin: 'shēng', hanViet: 'SINH', meaningVi: 'sinh', components: [], radical: '生', mnemonicVi: '', similarGroupId: null, status: 'published', position: 1 },
		],
		relatedWords: [],
	},
	{
		id: 'w2',
		simplified: '老师',
		pinyin: 'lǎoshī',
		hanViet: 'LÃO SƯ',
		meaningVi: 'giáo viên',
		partOfSpeech: 'danh từ',
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published',
		examples: [],
		patterns: [],
		chars: [],
		relatedWords: [],
	},
];

describe('generateQuestions (6 core types)', () => {
	it('generates requested number of questions', () => {
		const questions = generatePracticeSession(sampleWords, 10);
		expect(questions.length).toBeGreaterThan(0);
		expect(questions.length).toBeLessThanOrEqual(10);
	});

	it('only generates core question types', () => {
		const questions = generatePracticeSession(sampleWords, 20);
		for (const q of questions) {
			expect(CORE_QUESTION_TYPES).toContain(q.type);
		}
	});

	it('includes correct answer in options for MCQ types', () => {
		const questions = generatePracticeSession(sampleWords, 20, ['hanzi_to_meaning', 'meaning_to_hanzi']);
		for (const q of questions) {
			if (q.options) {
				expect(q.options).toContain(q.correctAnswer);
			}
		}
	});

	it('fill_sentence blanks using verified offsets', () => {
		const q = generateQuestionForWord(sampleWords[0], sampleWords, 'fill_sentence', 0);
		expect(q).toBeTruthy();
		expect(q!.sentenceTemplate).toContain('____');
		expect(q!.sentenceTemplate).not.toContain('学生');
	});

	it('single-word session with distractor pool yields multiple MCQ options', () => {
		const target = sampleWords[0];
		const questions = generatePracticeSession([target], 5, {
			group: 'core_vocab',
			distractorPool: sampleWords,
		});
		const meaningToHanzi = questions.find((q) => q.type === 'meaning_to_hanzi');
		expect(meaningToHanzi).toBeTruthy();
		expect(meaningToHanzi!.options!.length).toBeGreaterThanOrEqual(2);
	});

	it('sentence_usage generates fill_sentence when verified example exists', () => {
		const word = sampleWords[0];
		const questions = generatePracticeSession([word], 3, {
			group: 'sentence_usage',
			distractorPool: sampleWords,
			types: ['fill_sentence'],
		});
		expect(questions.some((q) => q.type === 'fill_sentence')).toBe(true);
	});
});
