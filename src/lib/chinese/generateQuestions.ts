/* ════════════════════════════════════════════════════════════════════════
   generateQuestions.ts — Practice question generator (6 core types)
   ════════════════════════════════════════════════════════════════════════ */
import {
	type PracticeGroup,
	type SkillChannel,
	type SessionContext,
	questionChannel,
	selectQuestionTypesForWord,
} from '@/lib/chinese/practiceTaxonomy';
import { buildMcqOptionsForType } from '@/lib/chinese/distractorSelect';
import { blankVerifiedExample, pickFillExample } from '@/lib/chinese/verifiedExample';
import { CN_MARK_KNOWN_HIDE_IDX } from '@/config/constants';
import type { CnExampleDTO, CnPracticeQuestionDTO, CnQuestionType, CnWordCardDTO, CnWordProgressDTO } from '@/types/chinese';

export const MIN_MCQ_OPTIONS = 2;

export interface GenerateSessionOptions {
	group?: PracticeGroup;
	progressMap?: Map<string, CnWordProgressDTO | null>;
	types?: CnQuestionType[];
	targetChannel?: SkillChannel;
	distractorPool?: CnWordCardDTO[];
	allowMarkKnown?: boolean;
	sessionContext?: SessionContext;
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

function makeId(wordId: string, type: CnQuestionType, idx: number): string {
	return `${wordId}-${type}-${idx}`;
}

function wordLearningExtras(word: CnWordCardDTO): Pick<CnPracticeQuestionDTO, 'usageNoteVi' | 'mnemonicVi'> {
	return {
		usageNoteVi: word.usageNoteVi || undefined,
		mnemonicVi: word.mnemonicVi || undefined,
	};
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

export function enrichQuestionWithProgress(
	q: CnPracticeQuestionDTO,
	progress: CnWordProgressDTO | null,
	allowMarkKnown = false,
): CnPracticeQuestionDTO {
	const channel = questionChannel(q.type);
	const channelIdx = progress
		? (channel === 'meaning' ? progress.meaningIntervalIdx
			: channel === 'listening' ? progress.listeningIntervalIdx
			: channel === 'pinyin' ? progress.pinyinIntervalIdx
			: progress.sentenceIntervalIdx)
		: 0;
	return {
		...q,
		channelIntervalIdx: channelIdx,
		canMarkKnown: allowMarkKnown && channelIdx < CN_MARK_KNOWN_HIDE_IDX,
		isStickingPoint: progress?.isStickingPoint ?? false,
	};
}

export function generateQuestionForWord(
	word: CnWordCardDTO,
	allWords: CnWordCardDTO[],
	type: CnQuestionType,
	idx: number,
	opts?: { example?: CnExampleDTO | null },
): CnPracticeQuestionDTO | null {
	const similarChars = collectSimilarChars(word, allWords);

	switch (type) {
		case 'hanzi_to_meaning': {
			const options = buildMcqOptionsForType(type, word, allWords, word.meaningVi);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Chọn nghĩa của: ${word.simplified}`,
				hanzi: word.simplified,
				options,
				correctAnswer: word.meaningVi,
				...wordLearningExtras(word),
			};
		}
		case 'meaning_to_hanzi': {
			const options = buildMcqOptionsForType(type, word, allWords, word.simplified, 3, similarChars);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Chọn Hán tự đúng',
				meaningVi: word.meaningVi,
				options,
				correctAnswer: word.simplified,
				...wordLearningExtras(word),
			};
		}
		case 'pinyin_to_hanzi': {
			const options = buildMcqOptionsForType(type, word, allWords, word.simplified, 3, similarChars);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Chọn Hán tự cho pinyin: ${word.pinyin}`,
				pinyin: word.pinyin,
				options,
				correctAnswer: word.simplified,
				...wordLearningExtras(word),
			};
		}
		case 'audio_to_hanzi': {
			const options = buildMcqOptionsForType(type, word, allWords, word.simplified, 3, similarChars);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Nghe và chọn Hán tự đúng',
				audioText: word.simplified,
				options,
				correctAnswer: word.simplified,
				...wordLearningExtras(word),
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
			const options = buildMcqOptionsForType(type, word, allWords, word.meaningVi, 3, similarMeanings);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Nghe và chọn nghĩa đúng',
				audioText: word.simplified,
				options,
				correctAnswer: word.meaningVi,
				...wordLearningExtras(word),
			};
		}
		case 'fill_sentence': {
			const example = opts?.example ?? pickFillExample(word);
			if (!example) return null;
			const blanked = blankVerifiedExample(example);
			if (!blanked) return null;
			const options = buildMcqOptionsForType(
				'fill_sentence',
				word,
				allWords,
				word.simplified,
				3,
				similarChars,
				example.hanzi,
			);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Điền từ vào câu: ${blanked}`,
				sentenceTemplate: blanked,
				options,
				correctAnswer: word.simplified,
				explanation: example.meaningVi,
				...wordLearningExtras(word),
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
				sessionContext: options.sessionContext ?? (options.allowMarkKnown ? 'review' : 'practice'),
			});

		for (let ti = 0; ti < typePool.length && questions.length < count; ti++) {
			if (questions.filter((q) => q.wordId === word.id).length >= perWord) break;
			const q = generateQuestionForWord(word, poolWords, typePool[ti], questions.length);
			if (q) {
				questions.push(enrichQuestionWithProgress(q, progress, options.allowMarkKnown ?? false));
			}
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
