/* ════════════════════════════════════════════════════════════════════════
   generateQuestions.ts — Practice question generator (12 types)
   ════════════════════════════════════════════════════════════════════════ */
import {
	type PracticeGroup,
	type SkillChannel,
	selectQuestionTypesForWord,
} from '@/lib/chinese/practiceTaxonomy';
import type { CnPracticeQuestionDTO, CnQuestionType, CnWordCardDTO, CnWordProgressDTO } from '@/types/chinese';

export const MIN_MCQ_OPTIONS = 2;

export interface GenerateSessionOptions {
	group?: PracticeGroup;
	progressMap?: Map<string, CnWordProgressDTO | null>;
	types?: CnQuestionType[];
	/** Target a specific skill channel (review sessions) */
	targetChannel?: SkillChannel;
	/** Broader vocabulary pool for MCQ distractors (e.g. all due words in review) */
	distractorPool?: CnWordCardDTO[];
}

export function mergeWordPools(
	sessionWords: CnWordCardDTO[],
	distractorPool?: CnWordCardDTO[],
): CnWordCardDTO[] {
	const byId = new Map<string, CnWordCardDTO>();
	for (const w of [...sessionWords, ...(distractorPool ?? [])]) {
		byId.set(w.id, w);
	}
	return [...byId.values()];
}

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

function pickDistractors(
	correct: string,
	pool: string[],
	count = 3,
	prefer?: string[],
): string[] {
	const dedupedPool = unique(pool).filter((v) => v !== correct);
	const preferred = unique(prefer ?? []).filter((v) => v !== correct && dedupedPool.includes(v));
	const rest = shuffle(dedupedPool.filter((v) => !preferred.includes(v)));

	const picked: string[] = [];
	for (const candidate of [...preferred, ...rest]) {
		if (picked.includes(candidate)) continue;
		picked.push(candidate);
		if (picked.length >= count) break;
	}
	return picked;
}

function buildMcqOptions(
	correct: string,
	pool: string[],
	count = 3,
	prefer?: string[],
): string[] | null {
	const distractors = pickDistractors(correct, pool, count, prefer);
	if (distractors.length < 1) return null;
	return shuffle(unique([correct, ...distractors]));
}

/** Chữ cùng nhóm similar — loại hán tự đã có trong từ hiện tại */
function collectSimilarChars(word: CnWordCardDTO, allWords: CnWordCardDTO[]): string[] {
	const ownChars = new Set(word.chars.map((c) => c.char));
	const collected = word.chars.flatMap((c) =>
		c.similarGroupId
			? allWords.flatMap((w) =>
				w.chars
					.filter((ch) => ch.similarGroupId === c.similarGroupId)
					.map((ch) => ch.char),
			)
			: [],
	);
	return unique(collected.filter((ch) => !ownChars.has(ch)));
}

function makeId(wordId: string, type: CnQuestionType, idx: number): string {
	return `${wordId}-${type}-${idx}`;
}

export function generateQuestionForWord(
	word: CnWordCardDTO,
	allWords: CnWordCardDTO[],
	type: CnQuestionType,
	idx: number,
): CnPracticeQuestionDTO | null {
	const poolHanzi = unique(allWords.map((w) => w.simplified));
	const poolMeaning = unique(allWords.map((w) => w.meaningVi));
	const poolPinyin = unique(allWords.map((w) => w.pinyin));
	const similarChars = collectSimilarChars(word, allWords);

	const example = word.examples[0];
	const pattern = word.patterns[0];
	const mainChar = word.chars[0];

	switch (type) {
		case 'hanzi_to_meaning': {
			const options = buildMcqOptions(word.meaningVi, poolMeaning);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Chọn nghĩa của: ${word.simplified}`,
				hanzi: word.simplified,
				options,
				correctAnswer: word.meaningVi,
			};
		}
		case 'meaning_to_hanzi': {
			const options = buildMcqOptions(word.simplified, poolHanzi, 3, similarChars);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Chọn Hán tự đúng',
				meaningVi: word.meaningVi,
				options,
				correctAnswer: word.simplified,
			};
		}
		case 'pinyin_to_hanzi': {
			const options = buildMcqOptions(word.simplified, poolHanzi, 3, similarChars);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Chọn Hán tự cho pinyin: ${word.pinyin}`,
				pinyin: word.pinyin,
				options,
				correctAnswer: word.simplified,
			};
		}
		case 'audio_to_hanzi': {
			const options = buildMcqOptions(word.simplified, poolHanzi, 3, similarChars);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Nghe và chọn Hán tự đúng',
				audioText: word.simplified,
				options,
				correctAnswer: word.simplified,
			};
		}
		case 'audio_to_meaning': {
			const similarMeanings = unique(
				allWords
					.filter((w) =>
						w.id !== word.id &&
						w.chars.some((wc) =>
							word.chars.some((c) => c.similarGroupId && c.similarGroupId === wc.similarGroupId),
						),
					)
					.map((w) => w.meaningVi),
			);
			const options = buildMcqOptions(word.meaningVi, poolMeaning, 3, similarMeanings);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Nghe và chọn nghĩa đúng',
				audioText: word.simplified,
				options,
				correctAnswer: word.meaningVi,
			};
		}
		case 'audio_to_pinyin': {
			const options = buildMcqOptions(word.pinyin, poolPinyin);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Nghe và chọn pinyin đúng',
				audioText: word.simplified,
				options,
				correctAnswer: word.pinyin,
			};
		}
		case 'fill_sentence': {
			if (!example) return null;
			const blanked = example.hanzi.replace(word.simplified, '____');
			const options = buildMcqOptions(word.simplified, poolHanzi, 3, similarChars);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Điền từ vào câu: ${blanked}`,
				sentenceTemplate: blanked,
				audioText: example.hanzi,
				options,
				correctAnswer: word.simplified,
			};
		}
		case 'sentence_order': {
			if (!example) return null;
			const parts = example.hanzi.replace(/[。！？]/g, '').split('');
			const shuffled = shuffle(parts).join('');
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Sắp xếp lại: ${shuffled}`,
				correctAnswer: example.hanzi.replace(/[。！？]/g, ''),
				explanation: example.meaningVi,
			};
		}
		case 'radical_pick': {
			if (!mainChar?.radical) return null;
			const radicals = unique(allWords.flatMap((w) => w.chars.map((c) => c.radical).filter(Boolean)));
			const options = buildMcqOptions(mainChar.radical, radicals);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Chọn bộ thủ của chữ: ${mainChar.char}`,
				hanzi: mainChar.char,
				radical: mainChar.radical,
				options,
				correctAnswer: mainChar.radical,
			};
		}
		case 'char_components': {
			if (!mainChar?.components.length) return null;
			const correct = mainChar.components.join(' + ');
			const fake = unique(
				allWords
					.flatMap((w) => w.chars.map((c) => c.components.join(' + ')))
					.filter((v) => v && v !== correct),
			);
			const options = buildMcqOptions(correct, fake);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Chọn thành phần của: ${mainChar.char}`,
				components: mainChar.components,
				options,
				correctAnswer: correct,
			};
		}
		case 'similar_char': {
			if (!similarChars.length) return null;
			const options = buildMcqOptions(word.simplified, poolHanzi, 3, similarChars);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Chọn Hán tự đúng',
				meaningVi: word.meaningVi,
				audioText: word.simplified,
				options,
				correctAnswer: word.simplified,
			};
		}
		case 'translate_sentence': {
			const sample = pattern?.samples[0];
			if (!sample?.meaningVi) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Dịch sang tiếng Trung: ${sample.meaningVi}`,
				meaningVi: sample.meaningVi,
				correctAnswer: sample.hanzi,
			};
		}
		default:
			return null;
	}
}

export function generatePracticeSession(
	words: CnWordCardDTO[],
	count = 20,
	optionsOrTypes: GenerateSessionOptions | CnQuestionType[] = {},
): CnPracticeQuestionDTO[] {
	if (!words.length) return [];

	const options: GenerateSessionOptions = Array.isArray(optionsOrTypes)
		? { types: optionsOrTypes }
		: optionsOrTypes;

	const group = options.group ?? 'smart_mixed';
	const progressMap = options.progressMap ?? new Map<string, CnWordProgressDTO | null>();
	const poolWords = mergeWordPools(words, options.distractorPool);
	const questions: CnPracticeQuestionDTO[] = [];
	const perWord = Math.max(1, Math.ceil(count / words.length));

	for (let wi = 0; wi < words.length && questions.length < count; wi++) {
		const word = words[wi];
		const progress = progressMap.get(word.id) ?? null;
		const typePool = options.types?.length
			? options.types
			: selectQuestionTypesForWord(word, progress, {
				group,
				count: perWord * 4,
				targetChannel: options.targetChannel,
			});

		for (let ti = 0; ti < typePool.length && questions.length < count; ti++) {
			if (questions.filter((q) => q.wordId === word.id).length >= perWord) break;
			const q = generateQuestionForWord(word, poolWords, typePool[ti], questions.length);
			if (q) questions.push(q);
		}
	}

	return shuffle(questions).slice(0, count);
}

export function generateListeningSession(
	words: CnWordCardDTO[],
	count = 10,
	progressMap?: Map<string, CnWordProgressDTO | null>,
): CnPracticeQuestionDTO[] {
	return generatePracticeSession(words, count, { group: 'listening', progressMap });
}

export function generateSentenceSession(
	words: CnWordCardDTO[],
	count = 10,
	progressMap?: Map<string, CnWordProgressDTO | null>,
): CnPracticeQuestionDTO[] {
	return generatePracticeSession(words, count, { group: 'sentence_usage', progressMap });
}
