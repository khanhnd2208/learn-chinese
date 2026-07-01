import { describe, it, expect } from 'vitest';
import {
	generatePracticeSession,
	generateQuestionForWord,
	generateReviewQuestion,
} from '@/lib/chinese/generateQuestions';
import { CORE_QUESTION_TYPES, questionChannel } from '@/lib/chinese/coreQuestionTypes';
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
	soundRate: 65,
	sentenceRate: 0,
	meaningTotal: 5,
	soundTotal: 7,
	sentenceTotal: 0,
	meaningIntervalIdx: 2,
	soundIntervalIdx: 1,
	sentenceIntervalIdx: 0,
};

describe('generateQuestions (7 core types)', () => {
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

	it('generates sound_to_hanzi MCQ with pinyin stimulus', () => {
		const q = generateQuestionForWord(sampleWords[0], sampleWords, 'sound_to_hanzi', 0);
		expect(q).toBeTruthy();
		expect(q!.pinyin).toBe('xuésheng');
		expect(q!.audioText).toBe('学生');
		expect(q!.options).toContain('学生');
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
				naturalnessStatus: 'draft',
			}],
		};
		const q = generateQuestionForWord(wordWithExamples, sampleWords, 'fill_sentence', 0);
		expect(q).toBeTruthy();
		expect(q!.sentenceTemplate).toContain('____');
		expect(q!.correctAnswer).toBe('学生');
		if (q!.type === 'fill_sentence') {
			expect(q!.options).toContain('学生');
		}
	});

	it('smart_mixed practice rotates all three SRS channels including sentence', () => {
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
		const progressMap = new Map<string, CnWordProgressDTO | null>([
			[wordWithExamples.id, progressAtRecall],
		]);
		const questions = generatePracticeSession([wordWithExamples], 8, {
			group: 'smart_mixed',
			progressMap,
			distractorPool: sampleWords,
		});
		const channels = new Set(questions.map((q) => questionChannel(q.type)));
		expect(channels.has('meaning')).toBe(true);
		expect(channels.has('sound')).toBe(true);
		expect(channels.has('sentence')).toBe(true);
		expect(questions.some((q) => q.type === 'fill_sentence' || q.type === 'fill_sentence_typed')).toBe(true);
	});

	it('falls back to fill_sentence_typed when MCQ distractors are insufficient', () => {
		const wordWithExamples: CnWordCardDTO = {
			...sampleWords[0],
			examples: [{
				id: 'ex1',
				hanzi: '他是学生。',
				pinyin: 'tā shì xuésheng.',
				meaningVi: 'Anh ấy là học sinh.',
				naturalnessStatus: 'auto',
				targetWordStart: 2,
				targetWordEnd: 4,
			}],
		};
		const q = generateQuestionForWord(wordWithExamples, [wordWithExamples], 'fill_sentence', 0);
		expect(q?.type).toBe('fill_sentence_typed');
		expect(q?.sentenceTemplate).toContain('____');
	});

	it('meaning channel mode uses stage-appropriate type only', () => {
		const progressMap = new Map<string, CnWordProgressDTO | null>([
			[sampleWords[0].id, progressAtRecall],
		]);
		const questions = generatePracticeSession([sampleWords[0]], 4, {
			group: 'core_vocab',
			targetChannel: 'meaning',
			progressMap,
			distractorPool: sampleWords,
		});
		expect(questions.length).toBeGreaterThan(0);
		expect(questions.every((q) => q.type === 'meaning_to_hanzi_typed')).toBe(true);
	});

	it('level_mcq1 mode uses MCQ1 types across channels at fixed interval', () => {
		const progressMap = new Map<string, CnWordProgressDTO | null>([
			[sampleWords[0].id, progressAtRecall],
		]);
		const questions = generatePracticeSession([sampleWords[0]], 8, {
			group: 'smart_mixed',
			fixedIntervalIdx: 0,
			progressMap,
			distractorPool: sampleWords,
		});
		const types = new Set(questions.map((q) => q.type));
		expect(types.has('hanzi_to_meaning')).toBe(true);
		expect(types.has('sound_to_hanzi')).toBe(true);
		expect(types.has('meaning_to_hanzi_typed')).toBe(false);
	});
});
