import { describe, it, expect } from 'vitest';
import { generatePracticeSession } from '@/lib/chinese/generateQuestions';
import type { CnWordCardDTO } from '@/types/chinese';

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
		examples: [{ id: 'e1', hanzi: '我是学生。', pinyin: 'Wǒ shì xuésheng.', meaningVi: 'Tôi là học sinh.' }],
		patterns: [{ id: 'p1', template: '我是 + N', samples: [{ hanzi: '我是学生。', pinyin: 'Wǒ shì xuésheng.', meaningVi: 'Tôi là học sinh.' }] }],
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
		examples: [{ id: 'e2', hanzi: '他是老师。', pinyin: 'Tā shì lǎoshī.', meaningVi: 'Anh ấy là giáo viên.' }],
		patterns: [],
		chars: [],
		relatedWords: [],
	},
];

function mkSimilarWord(
	id: string,
	simplified: string,
	meaningVi: string,
	char: string,
	similarGroupId: string,
): CnWordCardDTO {
	return {
		id,
		simplified,
		pinyin: simplified,
		hanViet: simplified,
		meaningVi,
		partOfSpeech: 'danh từ',
		mnemonicVi: '',
		hskLevel: 1,
		status: 'published',
		examples: [],
		patterns: [],
		relatedWords: [],
		chars: [{
			id: char,
			char,
			pinyin: char,
			hanViet: char,
			meaningVi,
			components: [],
			radical: 'x',
			mnemonicVi: '',
			similarGroupId,
			status: 'published',
			position: 0,
		}],
	};
}

const similarGroupWords: CnWordCardDTO[] = [
	mkSimilarWord('q1', '请', 'xin, mời', '请', 'sg-qing'),
	mkSimilarWord('q2', '请问', 'xin hỏi', '请', 'sg-qing'),
	mkSimilarWord('q3', '情', 'tình cảm', '情', 'sg-qing'),
	mkSimilarWord('q4', '清', 'trong sạch', '清', 'sg-qing'),
	mkSimilarWord('q5', '晴', 'trời quang', '晴', 'sg-qing'),
	mkSimilarWord('q6', '喜欢', 'thích', '喜', 'sg-other'),
];

describe('generateQuestions', () => {
	it('generates requested number of questions', () => {
		const questions = generatePracticeSession(sampleWords, 10);
		expect(questions.length).toBeGreaterThan(0);
		expect(questions.length).toBeLessThanOrEqual(10);
	});

	it('includes correct answer in options for MCQ types', () => {
		const questions = generatePracticeSession(sampleWords, 20, ['hanzi_to_meaning', 'meaning_to_hanzi']);
		for (const q of questions) {
			if (q.options) {
				expect(q.options).toContain(q.correctAnswer);
			}
		}
	});

	it('never produces duplicate MCQ options', () => {
		const allTypes = [
			'hanzi_to_meaning',
			'meaning_to_hanzi',
			'pinyin_to_hanzi',
			'audio_to_hanzi',
			'audio_to_meaning',
			'audio_to_pinyin',
			'fill_sentence',
			'radical_pick',
			'char_components',
			'similar_char',
		] as const;

		for (let run = 0; run < 100; run++) {
			const questions = generatePracticeSession(similarGroupWords, 30, [...allTypes]);
			for (const q of questions) {
				if (!q.options) continue;
				expect(new Set(q.options).size).toBe(q.options.length);
				expect(q.options).toContain(q.correctAnswer);
			}
		}
	});

	it('similar_char uses the target word as correct answer', () => {
		const questions = generatePracticeSession(similarGroupWords, 20, ['similar_char']);
		for (const q of questions) {
			const word = similarGroupWords.find((w) => w.id === q.wordId);
			expect(word).toBeTruthy();
			expect(q.correctAnswer).toBe(word!.simplified);
		}
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

	it('sentence_usage generates fill_sentence when word has examples', () => {
		const word = sampleWords[0];
		const questions = generatePracticeSession([word], 3, {
			group: 'sentence_usage',
			distractorPool: sampleWords,
			types: ['fill_sentence', 'sentence_order', 'translate_sentence'],
		});
		expect(questions.some((q) => q.type === 'fill_sentence')).toBe(true);
	});
});
