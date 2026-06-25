/* ════════════════════════════════════════════════════════════════════════
   generateQuestions.ts — Practice question generator (9 core types)
   ════════════════════════════════════════════════════════════════════════ */
import {
	type PracticeGroup,
	type SkillChannel,
	type SessionContext,
	questionChannel,
	reviewQuestionTypeForChannel,
	selectQuestionTypesForWord,
	wordSupportsQuestionType,
	practiceIntervalIdxForChannel,
} from '@/lib/chinese/practiceTaxonomy';
import { ALL_SKILL_CHANNELS } from '@/lib/chinese/coreQuestionTypes';
import { buildMcqOptionsForType } from '@/lib/chinese/distractorSelect';
import { blankMeaningViExample, blankVerifiedExample, FILL_EXAMPLE_STATUSES, pickFillExample } from '@/lib/chinese/verifiedExample';
import type { CnPracticeQuestionDTO, CnQuestionType, CnWordCardDTO, CnWordProgressDTO } from '@/types/chinese';

export const MIN_MCQ_OPTIONS = 2;

export interface GenerateSessionOptions {
	group?: PracticeGroup;
	progressMap?: Map<string, CnWordProgressDTO | null>;
	types?: CnQuestionType[];
	targetChannel?: SkillChannel;
	distractorPool?: CnWordCardDTO[];
	sessionContext?: SessionContext;
	/** Practice-only: force all channels to this SRS interval (ignores progress). */
	fixedIntervalIdx?: number;
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

/** Interleave questions by wordId so same-word items are spread across the session. */
export function spreadShuffle(questions: CnPracticeQuestionDTO[]): CnPracticeQuestionDTO[] {
	const groups = new Map<string, CnPracticeQuestionDTO[]>();
	for (const q of questions) {
		const list = groups.get(q.wordId) ?? [];
		list.push(q);
		groups.set(q.wordId, list);
	}

	for (const [wordId, list] of groups) {
		groups.set(wordId, shuffle(list));
	}

	const groupKeys = shuffle([...groups.keys()]);
	const result: CnPracticeQuestionDTO[] = [];
	let hasMore = true;
	while (hasMore) {
		hasMore = false;
		for (const key of groupKeys) {
			const list = groups.get(key)!;
			if (list.length > 0) {
				result.push(list.shift()!);
				hasMore = true;
			}
		}
	}
	return result;
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

function makeId(wordId: string, type: CnQuestionType, idx: number): string {
	return `${wordId}-${type}-${idx}`;
}

function wordLearningExtras(word: CnWordCardDTO): Pick<CnPracticeQuestionDTO, 'usageNoteVi' | 'mnemonicVi'> {
	const note = word.ghiChu || word.usageNoteVi || word.mnemonicVi;
	return {
		usageNoteVi: note || undefined,
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

function channelIntervalIdx(progress: CnWordProgressDTO | null, channel: SkillChannel): number {
	if (!progress) return 0;
	switch (channel) {
		case 'meaning': return progress.meaningIntervalIdx;
		case 'listening': return progress.listeningIntervalIdx;
		case 'pinyin': return progress.pinyinIntervalIdx;
		case 'sentence': return progress.sentenceIntervalIdx;
	}
}

export function enrichQuestionWithProgress(
	q: CnPracticeQuestionDTO,
	progress: CnWordProgressDTO | null,
	displayIntervalIdx?: number,
): CnPracticeQuestionDTO {
	const channel = questionChannel(q.type);
	const channelIdx = displayIntervalIdx ?? channelIntervalIdx(progress, channel);
	return {
		...q,
		channelIntervalIdx: channelIdx,
		isStickingPoint: progress?.isStickingPoint ?? false,
	};
}

function buildFillSentenceQuestion(
	word: CnWordCardDTO,
	allWords: CnWordCardDTO[],
	type: 'fill_sentence' | 'fill_sentence_typed',
	idx: number,
	excludeExampleId?: string,
): CnPracticeQuestionDTO | null {
	const example = pickFillExample(word, FILL_EXAMPLE_STATUSES, Math.random, excludeExampleId);
	if (!example) return null;
	const sentenceTemplate = blankVerifiedExample(example);
	if (!sentenceTemplate) return null;
	const sentenceMeaningVi = blankMeaningViExample(example) ?? undefined;
	const base = {
		id: makeId(word.id, type, idx),
		wordId: word.id,
		type,
		prompt: 'Chọn từ điền vào chỗ trống',
		sentenceTemplate,
		sentenceMeaningVi,
		pinyin: example.pinyin || undefined,
		meaningVi: word.meaningVi,
		correctAnswer: word.simplified,
		exampleId: example.id,
		...wordLearningExtras(word),
	};

	if (type === 'fill_sentence_typed') {
		return {
			...base,
			prompt: 'Gõ Hán tự điền vào chỗ trống',
		};
	}

	const options = buildMcqOptionsForType('fill_sentence', word, allWords, word.simplified);
	if (!options || options.length < MIN_MCQ_OPTIONS) {
		return buildFillSentenceQuestion(word, allWords, 'fill_sentence_typed', idx, excludeExampleId);
	}
	return { ...base, options };
}

export function generateQuestionForWord(
	word: CnWordCardDTO,
	allWords: CnWordCardDTO[],
	type: CnQuestionType,
	idx: number,
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
		case 'hanzi_to_pinyin': {
			const options = buildMcqOptionsForType(type, word, allWords, word.pinyin);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Chọn pinyin của: ${word.simplified}`,
				hanzi: word.simplified,
				options,
				correctAnswer: word.pinyin,
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
		case 'meaning_to_hanzi_typed':
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Gõ Hán tự cho nghĩa sau',
				meaningVi: word.meaningVi,
				correctAnswer: word.simplified,
				...wordLearningExtras(word),
			};
		case 'hanzi_to_pinyin_typed':
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: `Gõ pinyin của: ${word.simplified}`,
				hanzi: word.simplified,
				correctAnswer: word.pinyin,
				...wordLearningExtras(word),
			};
		case 'audio_to_hanzi_typed':
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Nghe và gõ Hán tự',
				audioText: word.simplified,
				correctAnswer: word.simplified,
				...wordLearningExtras(word),
			};
		case 'fill_sentence':
			return buildFillSentenceQuestion(word, allWords, 'fill_sentence', idx);
		case 'fill_sentence_typed':
			return buildFillSentenceQuestion(word, allWords, 'fill_sentence_typed', idx);
		default:
			return null;
	}
}

/** Rotate all four SRS channels so practice covers meaning, listening, pinyin, and sentence. */
function generateBalancedChannelPracticeSession(
	words: CnWordCardDTO[],
	count: number,
	progressMap: Map<string, CnWordProgressDTO | null>,
	poolWords: CnWordCardDTO[],
	fixedIntervalIdx?: number,
): CnPracticeQuestionDTO[] {
	const questions: CnPracticeQuestionDTO[] = [];
	let channelRound = 0;
	let wordRound = 0;
	const maxAttempts = count * Math.max(1, words.length) * ALL_SKILL_CHANNELS.length;

	for (let attempt = 0; attempt < maxAttempts && questions.length < count; attempt++) {
		const word = words[wordRound % words.length];
		const channel = ALL_SKILL_CHANNELS[channelRound % ALL_SKILL_CHANNELS.length];
		const progress = progressMap.get(word.id) ?? null;
		const intervalIdx = practiceIntervalIdxForChannel(progress, channel, fixedIntervalIdx);
		const type = reviewQuestionTypeForChannel(channel, intervalIdx);

		if (wordSupportsQuestionType(word, type)) {
			const q = generateQuestionForWord(word, poolWords, type, questions.length);
			if (q) {
				questions.push(enrichQuestionWithProgress(q, progress, intervalIdx));
			}
		}

		channelRound++;
		if (channelRound % ALL_SKILL_CHANNELS.length === 0) {
			wordRound++;
		}
	}

	return spreadShuffle(questions).slice(0, count);
}

/** One SRS channel only — stage from progress or fixed interval. */
function generateSingleChannelPracticeSession(
	words: CnWordCardDTO[],
	count: number,
	progressMap: Map<string, CnWordProgressDTO | null>,
	poolWords: CnWordCardDTO[],
	channel: SkillChannel,
	fixedIntervalIdx?: number,
): CnPracticeQuestionDTO[] {
	const questions: CnPracticeQuestionDTO[] = [];
	let wordRound = 0;
	const maxAttempts = count * Math.max(1, words.length) * 2;

	for (let attempt = 0; attempt < maxAttempts && questions.length < count; attempt++) {
		const word = words[wordRound % words.length];
		const progress = progressMap.get(word.id) ?? null;
		const intervalIdx = practiceIntervalIdxForChannel(progress, channel, fixedIntervalIdx);
		const type = reviewQuestionTypeForChannel(channel, intervalIdx);

		if (wordSupportsQuestionType(word, type)) {
			const q = generateQuestionForWord(word, poolWords, type, questions.length);
			if (q) {
				questions.push(enrichQuestionWithProgress(q, progress, intervalIdx));
			}
		}

		wordRound++;
	}

	return spreadShuffle(questions).slice(0, count);
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
	const sessionContext = options.sessionContext ?? 'practice';
	const progressMap = options.progressMap ?? new Map<string, CnWordProgressDTO | null>();
	const poolWords = mergeWordPools(words, options.distractorPool);

	if (
		group === 'smart_mixed'
		&& sessionContext === 'practice'
		&& !options.types?.length
		&& !options.targetChannel
	) {
		return generateBalancedChannelPracticeSession(
			words,
			count,
			progressMap,
			poolWords,
			options.fixedIntervalIdx,
		);
	}

	if (
		options.targetChannel
		&& sessionContext === 'practice'
		&& !options.types?.length
	) {
		return generateSingleChannelPracticeSession(
			words,
			count,
			progressMap,
			poolWords,
			options.targetChannel,
			options.fixedIntervalIdx,
		);
	}

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
				sessionContext,
				fixedIntervalIdx: options.fixedIntervalIdx,
			});

		for (let ti = 0; ti < typePool.length && questions.length < count; ti++) {
			if (questions.filter((q) => q.wordId === word.id).length >= perWord) break;
			const q = generateQuestionForWord(word, poolWords, typePool[ti], questions.length);
			if (q) {
				questions.push(enrichQuestionWithProgress(q, progress));
			}
		}
	}

	return spreadShuffle(questions).slice(0, count);
}

export function generateListeningSession(
	words: CnWordCardDTO[],
	count = 10,
	progressMap?: Map<string, CnWordProgressDTO | null>,
): CnPracticeQuestionDTO[] {
	return generatePracticeSession(words, count, { group: 'listening', progressMap });
}

/** Generate one review question for a due channel entry */
export function generateReviewQuestion(
	word: CnWordCardDTO,
	allWords: CnWordCardDTO[],
	channel: SkillChannel,
	progress: CnWordProgressDTO | null,
	idx: number,
): CnPracticeQuestionDTO | null {
	const intervalIdx = channelIntervalIdx(progress, channel);
	const type = reviewQuestionTypeForChannel(channel, intervalIdx);
	const excludeExampleId = channel === 'sentence' ? progress?.lastExampleId ?? undefined : undefined;

	if (type === 'fill_sentence' || type === 'fill_sentence_typed') {
		const q = buildFillSentenceQuestion(word, allWords, type, idx, excludeExampleId);
		return q ? enrichQuestionWithProgress(q, progress) : null;
	}

	const q = generateQuestionForWord(word, allWords, type, idx);
	return q ? enrichQuestionWithProgress(q, progress) : null;
}
