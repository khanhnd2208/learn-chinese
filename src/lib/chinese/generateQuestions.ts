/* ════════════════════════════════════════════════════════════════════════
   generateQuestions.ts — Practice question generator (7 core types)
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
	soundMcqHardMode,
	PRACTICE_FILL_TYPES_BY_CHANNEL,
	PRACTICE_MCQ_TYPES_BY_CHANNEL,
} from '@/lib/chinese/practiceTaxonomy';
import { ALL_SKILL_CHANNELS } from '@/lib/chinese/coreQuestionTypes';
import { buildMcqOptionsForType } from '@/lib/chinese/distractorSelect';
import { blankVerifiedExample, FILL_EXAMPLE_STATUSES, fullMeaningViForExample, pickFillExample } from '@/lib/chinese/verifiedExample';
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
	/** Practice-only: MCQ or fill-in type pools rotated across 3 channels. */
	practiceFormat?: 'mixed' | 'mcq' | 'fill';
}

export interface GenerateQuestionOptions {
	/** Harder distractors for sound_to_hanzi (mcq2 / maintain MCQ roll) */
	hardMode?: boolean;
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
		case 'sound': return progress.soundIntervalIdx;
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
	const sentenceMeaningVi = fullMeaningViForExample(example, word.meaningVi) ?? undefined;
	const base = {
		id: makeId(word.id, type, idx),
		wordId: word.id,
		type,
		prompt: 'Chọn từ điền vào chỗ trống',
		sentenceTemplate,
		sentenceMeaningVi,
		sentenceAudioText: example.hanzi,
		pinyin: example.pinyin || undefined,
		wordPinyin: word.pinyin || undefined,
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
	genOptions: GenerateQuestionOptions = {},
): CnPracticeQuestionDTO | null {
	const similarChars = collectSimilarChars(word, allWords);
	const { hardMode = false } = genOptions;

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
				pinyin: word.pinyin,
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
				pinyin: word.pinyin,
				options,
				correctAnswer: word.simplified,
				...wordLearningExtras(word),
			};
		}
		case 'sound_to_hanzi': {
			const options = buildMcqOptionsForType(
				type, word, allWords, word.simplified, 3, similarChars, hardMode,
			);
			if (!options || options.length < MIN_MCQ_OPTIONS) return null;
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Nghe âm đọc và chọn Hán tự đúng',
				audioText: word.simplified,
				pinyin: word.pinyin,
				meaningVi: word.meaningVi,
				options,
				correctAnswer: word.simplified,
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
				pinyin: word.pinyin,
				correctAnswer: word.simplified,
				...wordLearningExtras(word),
			};
		case 'sound_to_hanzi_typed':
			return {
				id: makeId(word.id, type, idx),
				wordId: word.id,
				type,
				prompt: 'Nghe âm đọc và gõ Hán tự',
				audioText: word.simplified,
				pinyin: word.pinyin,
				meaningVi: word.meaningVi,
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

/**
 * Order words by least session usage first (ties keep shuffled order).
 * Prevents always drilling the same DB-ordered head of a set across sessions.
 */
function wordsByLeastUsage(
	words: CnWordCardDTO[],
	usage: Map<string, number>,
): CnWordCardDTO[] {
	return [...words].sort((a, b) => (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0));
}

/** Rotate all three SRS channels so practice covers meaning, sound, and sentence. */
function generateBalancedChannelPracticeSession(
	words: CnWordCardDTO[],
	count: number,
	progressMap: Map<string, CnWordProgressDTO | null>,
	poolWords: CnWordCardDTO[],
	fixedIntervalIdx?: number,
): CnPracticeQuestionDTO[] {
	const shuffled = shuffle(words);
	const questions: CnPracticeQuestionDTO[] = [];
	const usage = new Map<string, number>();
	let channelRound = 0;
	let consecutiveMisses = 0;
	const maxAttempts = count * Math.max(1, words.length) * ALL_SKILL_CHANNELS.length;

	for (let attempt = 0; attempt < maxAttempts && questions.length < count; attempt++) {
		const channel = ALL_SKILL_CHANNELS[channelRound % ALL_SKILL_CHANNELS.length];
		const ordered = wordsByLeastUsage(shuffled, usage);
		let placed = false;

		for (const word of ordered) {
			const progress = progressMap.get(word.id) ?? null;
			const intervalIdx = practiceIntervalIdxForChannel(progress, channel, fixedIntervalIdx);
			const type = reviewQuestionTypeForChannel(channel, intervalIdx);
			if (!wordSupportsQuestionType(word, type)) continue;

			const hardMode = soundMcqHardMode(intervalIdx, type);
			const q = generateQuestionForWord(word, poolWords, type, questions.length, { hardMode });
			if (!q) continue;

			questions.push(enrichQuestionWithProgress(q, progress, intervalIdx));
			usage.set(word.id, (usage.get(word.id) ?? 0) + 1);
			placed = true;
			break;
		}

		channelRound++;
		if (placed) {
			consecutiveMisses = 0;
		} else {
			consecutiveMisses++;
			// Entire channel unsupported by the set (e.g. no fill examples) — skip and continue
			if (consecutiveMisses >= ALL_SKILL_CHANNELS.length) break;
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
	const shuffled = shuffle(words);
	const questions: CnPracticeQuestionDTO[] = [];
	const usage = new Map<string, number>();
	const maxAttempts = count * Math.max(1, words.length) * 2;

	for (let attempt = 0; attempt < maxAttempts && questions.length < count; attempt++) {
		const ordered = wordsByLeastUsage(shuffled, usage);
		let placed = false;

		for (const word of ordered) {
			const progress = progressMap.get(word.id) ?? null;
			const intervalIdx = practiceIntervalIdxForChannel(progress, channel, fixedIntervalIdx);
			const type = reviewQuestionTypeForChannel(channel, intervalIdx);
			if (!wordSupportsQuestionType(word, type)) continue;

			const hardMode = soundMcqHardMode(intervalIdx, type);
			const q = generateQuestionForWord(word, poolWords, type, questions.length, { hardMode });
			if (!q) continue;

			questions.push(enrichQuestionWithProgress(q, progress, intervalIdx));
			usage.set(word.id, (usage.get(word.id) ?? 0) + 1);
			placed = true;
			break;
		}

		if (!placed) break;
	}

	return spreadShuffle(questions).slice(0, count);
}

/**
 * Rotate 3 channels using a fixed MCQ or fill-in type pool per channel.
 * Shuffles the set and prefers least-used words so sessions cover the full set
 * instead of always drilling the same DB-ordered head (~7 words for count=20).
 */
function generateBalancedFormatPracticeSession(
	words: CnWordCardDTO[],
	count: number,
	progressMap: Map<string, CnWordProgressDTO | null>,
	poolWords: CnWordCardDTO[],
	typesByChannel: Record<SkillChannel, CnQuestionType[]>,
): CnPracticeQuestionDTO[] {
	const shuffled = shuffle(words);
	const questions: CnPracticeQuestionDTO[] = [];
	const usage = new Map<string, number>();
	let channelRound = 0;
	let consecutiveMisses = 0;
	const maxAttempts = count * Math.max(1, words.length) * ALL_SKILL_CHANNELS.length * 3;

	for (let attempt = 0; attempt < maxAttempts && questions.length < count; attempt++) {
		const channel = ALL_SKILL_CHANNELS[channelRound % ALL_SKILL_CHANNELS.length];
		const typeCandidates = typesByChannel[channel];
		const ordered = wordsByLeastUsage(shuffled, usage);
		let placed = false;

		for (const word of ordered) {
			const progress = progressMap.get(word.id) ?? null;
			for (const type of typeCandidates) {
				if (!wordSupportsQuestionType(word, type)) continue;
				const q = generateQuestionForWord(word, poolWords, type, questions.length);
				if (!q) continue;

				questions.push(enrichQuestionWithProgress(q, progress));
				usage.set(word.id, (usage.get(word.id) ?? 0) + 1);
				placed = true;
				break;
			}
			if (placed) break;
		}

		channelRound++;
		if (placed) {
			consecutiveMisses = 0;
		} else {
			consecutiveMisses++;
			if (consecutiveMisses >= ALL_SKILL_CHANNELS.length) break;
		}
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
		options.practiceFormat === 'mcq'
		&& sessionContext === 'practice'
		&& !options.types?.length
		&& !options.targetChannel
	) {
		return generateBalancedFormatPracticeSession(
			words,
			count,
			progressMap,
			poolWords,
			PRACTICE_MCQ_TYPES_BY_CHANNEL,
		);
	}

	if (
		options.practiceFormat === 'fill'
		&& sessionContext === 'practice'
		&& !options.types?.length
		&& !options.targetChannel
	) {
		return generateBalancedFormatPracticeSession(
			words,
			count,
			progressMap,
			poolWords,
			PRACTICE_FILL_TYPES_BY_CHANNEL,
		);
	}

	if (
		group === 'smart_mixed'
		&& sessionContext === 'practice'
		&& !options.types?.length
		&& !options.targetChannel
		&& (options.practiceFormat === 'mixed' || options.practiceFormat === undefined)
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

export function generateSoundSession(
	words: CnWordCardDTO[],
	count = 10,
	progressMap?: Map<string, CnWordProgressDTO | null>,
): CnPracticeQuestionDTO[] {
	return generatePracticeSession(words, count, { group: 'sound', progressMap });
}

/** @deprecated Use generateSoundSession */
export function generateListeningSession(
	words: CnWordCardDTO[],
	count = 10,
	progressMap?: Map<string, CnWordProgressDTO | null>,
): CnPracticeQuestionDTO[] {
	return generateSoundSession(words, count, progressMap);
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

	const q = generateQuestionForWord(word, allWords, type, idx, {
		hardMode: soundMcqHardMode(intervalIdx, type),
	});
	return q ? enrichQuestionWithProgress(q, progress) : null;
}

const INFERNO_MCQ_BY_CHANNEL: Record<SkillChannel, CnQuestionType[]> = {
	meaning: ['hanzi_to_meaning', 'meaning_to_hanzi'],
	sound: ['sound_to_hanzi'],
	sentence: ['fill_sentence'],
};

const INFERNO_FILL_BY_CHANNEL: Record<SkillChannel, CnQuestionType[]> = {
	meaning: ['meaning_to_hanzi_typed'],
	sound: ['sound_to_hanzi_typed'],
	sentence: ['fill_sentence_typed'],
};

export interface InfernoWordChannel {
	wordId: string;
	channel: SkillChannel;
}

function pickInfernoQuestionType(
	channel: SkillChannel,
	rng: () => number,
): CnQuestionType[] {
	const useFill = rng() < 0.7;
	return useFill ? INFERNO_FILL_BY_CHANNEL[channel] : INFERNO_MCQ_BY_CHANNEL[channel];
}

/** Generate one Địa Ngục question — high difficulty, ignores SRS stage unlock */
export function generateInfernoQuestion(
	word: CnWordCardDTO,
	allWords: CnWordCardDTO[],
	channel: SkillChannel,
	progress: CnWordProgressDTO | null,
	idx: number,
	rng: () => number = Math.random,
): CnPracticeQuestionDTO | null {
	const primaryTypes = pickInfernoQuestionType(channel, rng);
	const fallbackTypes = pickInfernoQuestionType(channel, () => (rng() < 0.7 ? 0.2 : 0.8));
	const typeCandidates = [...primaryTypes, ...fallbackTypes];

	for (const type of typeCandidates) {
		if (!wordSupportsQuestionType(word, type)) continue;
		const q = generateQuestionForWord(word, allWords, type, idx, { hardMode: true });
		if (q) return enrichQuestionWithProgress(q, progress);
	}

	for (const ch of ALL_SKILL_CHANNELS) {
		if (ch === channel) continue;
		for (const type of [...INFERNO_FILL_BY_CHANNEL[ch], ...INFERNO_MCQ_BY_CHANNEL[ch]]) {
			if (!wordSupportsQuestionType(word, type)) continue;
			const q = generateQuestionForWord(word, allWords, type, idx, { hardMode: true });
			if (q) return enrichQuestionWithProgress(q, progress);
		}
	}

	return null;
}
