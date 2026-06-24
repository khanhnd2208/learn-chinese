import { describe, it, expect } from 'vitest';
import {
	generatePracticeSession,
	generateQuestionForWord,
	generateReviewQuestion,
} from '@/lib/chinese/generateQuestions';
import { CORE_QUESTION_TYPES } from '@/lib/chinese/coreQuestionTypes';
import type { CnWordCardDTO, CnWordProgressDTO } from '@/types/chinese';

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
		examples: [],
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

const progressAtRecall: CnWordProgressDTO = {
	wordId: 'w1',
	state: 'familiar',
	dueAt: new Date().toISOString(),
	intervalIdx: 2,
	lastReviewedAt: null,
	meaningRate: 80,
	listeningRate: 70,
	pinyinRate: 60,
	sentenceRate: 0,
	meaningTotal: 5,
	listeningTotal: 4,
	pinyinTotal: 3,
	sentenceTotal: 0,
	meaningIntervalIdx: 2,
	listeningIntervalIdx: 1,
	pinyinIntervalIdx: 0,
	sentenceIntervalIdx: 0,
};

describe('generateQuestions (11 core types)', () => {
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

	it('generates typed recall without options', () => {
		const q = generateQuestionForWord(sampleWords[0], sampleWords, 'meaning_to_hanzi_typed', 0);
		expect(q).toBeTruthy();
		expect(q!.options).toBeUndefined();
		expect(q!.correctAnswer).toBe('学生');
	});

	it('generates hanzi_to_pinyin MCQ', () => {
		const q = generateQuestionForWord(sampleWords[0], sampleWords, 'hanzi_to_pinyin', 0);
		expect(q).toBeTruthy();
		expect(q!.options).toContain('xuésheng');
	});

	it('review question follows channel stage', () => {
		const q = generateReviewQuestion(sampleWords[0], sampleWords, 'meaning', progressAtRecall, 0);
		expect(q?.type).toBe('meaning_to_hanzi_typed');
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

	it('generates fill_sentence when word has fill examples', () => {
		const wordWithExamples: CnWordCardDTO = {
			...sampleWords[0],
			examples: [{
				id: 'ex1',
				hanzi: '他是学生。',
				pinyin: 'tā shì xuésheng.',
				meaningVi: 'Anh ấy là học sinh.',
				meaningViTemplate: 'Anh ấy là __.',
				targetWordStart: 2,
				targetWordEnd: 4,
				naturalnessStatus: 'auto',
			}],
		};
		const q = generateQuestionForWord(wordWithExamples, sampleWords, 'fill_sentence', 0);
		expect(q).toBeTruthy();
		expect(q!.sentenceTemplate).toContain('____');
		expect(q!.sentenceMeaningVi).toContain('__');
		expect(q!.options).toContain('学生');
	});
});
