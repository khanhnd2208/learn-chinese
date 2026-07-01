/* ════════════════════════════════════════════════════════════════════════
   practiceTaxonomy.ts — Skill groups, channel unlock, smart question selection
   ════════════════════════════════════════════════════════════════════════ */
import { stageFromIntervalIdx } from '@/config/constants';
import {
	ALL_SKILL_CHANNELS,
	questionChannel,
	type SkillChannel,
} from '@/lib/chinese/coreQuestionTypes';
import { pickFillExample } from '@/lib/chinese/verifiedExample';
import type {
	CnQuestionType,
	CnWordCardDTO,
	CnWordProgressDTO,
} from '@/types/chinese';

export type { SkillChannel };
export { ALL_SKILL_CHANNELS, questionChannel };

export type PracticeGroup =
	| 'core_vocab'
	| 'sound'
	| 'sentence'
	| 'smart_mixed';

export type SessionContext = 'review' | 'practice';

export interface GoalWeights {
	meaning: number;
	sound: number;
	sentence: number;
}

export const DEFAULT_GOAL_WEIGHTS: GoalWeights = {
	meaning: 30,
	sound: 45,
	sentence: 25,
};

export const GROUP_QUESTION_MAP: Record<Exclude<PracticeGroup, 'smart_mixed'>, CnQuestionType[]> = {
	core_vocab: ['hanzi_to_meaning', 'meaning_to_hanzi'],
	sound: ['sound_to_hanzi'],
	sentence: ['fill_sentence'],
};

export const CHANNEL_TO_GROUP: Record<SkillChannel, Exclude<PracticeGroup, 'smart_mixed'>> = {
	meaning: 'core_vocab',
	sound: 'sound',
	sentence: 'sentence',
};

const WEAK_MASTERY_THRESHOLD = 60;

export function practiceModeToGroup(mode: string): PracticeGroup {
	return resolvePracticeSessionMode(mode).group;
}

export interface PracticeSessionMode {
	group: PracticeGroup;
	targetChannel?: SkillChannel;
	/** Fixed SRS interval for all channels — practice only, ignores per-word progress. */
	fixedIntervalIdx?: number;
	/** Practice format bucket — mixed uses SRS progress; mcq/fill use fixed type pools per channel. */
	practiceFormat?: 'mixed' | 'mcq' | 'fill';
}

/** MCQ question types per SRS channel (practice) */
export const PRACTICE_MCQ_TYPES_BY_CHANNEL: Record<SkillChannel, CnQuestionType[]> = {
	meaning: ['hanzi_to_meaning', 'meaning_to_hanzi'],
	sound: ['sound_to_hanzi'],
	sentence: ['fill_sentence'],
};

/** Typed / fill-in question types per SRS channel (practice) */
export const PRACTICE_FILL_TYPES_BY_CHANNEL: Record<SkillChannel, CnQuestionType[]> = {
	meaning: ['meaning_to_hanzi_typed'],
	sound: ['sound_to_hanzi_typed'],
	sentence: ['fill_sentence_typed'],
};

export const PRACTICE_MCQ_TYPES = Object.values(PRACTICE_MCQ_TYPES_BY_CHANNEL).flat();
export const PRACTICE_FILL_TYPES = Object.values(PRACTICE_FILL_TYPES_BY_CHANNEL).flat();

/** URL `mode` → session options. Level modes fix SRS difficulty; mix uses each word's progress. */
export function resolvePracticeSessionMode(mode: string): PracticeSessionMode {
	const normalized = mode.trim().toLowerCase();
	switch (normalized) {
		case 'mixed':
		case 'smart_mixed':
			return { group: 'smart_mixed', practiceFormat: 'mixed' };
		case 'mcq':
		case 'mcqs':
		case 'practice_mcq':
			return { group: 'smart_mixed', practiceFormat: 'mcq' };
		case 'fill':
		case 'dien_tu':
		case 'practice_fill':
			return { group: 'smart_mixed', practiceFormat: 'fill' };
		case 'level_mcq1':
		case 'lv0':
		case 'srs_mcq1':
			return { group: 'smart_mixed', fixedIntervalIdx: 0 };
		case 'level_mcq2':
		case 'lv1':
		case 'srs_mcq2':
			return { group: 'smart_mixed', fixedIntervalIdx: 1 };
		case 'level_recall':
		case 'lv2':
		case 'srs_recall':
			return { group: 'smart_mixed', fixedIntervalIdx: 2 };
		case 'level_maintain':
		case 'lv3':
		case 'srs_maintain':
			return { group: 'smart_mixed', fixedIntervalIdx: 3 };
		// Legacy channel modes (deep links) — listening/pinyin → sound
		case 'meaning':
		case 'core_vocab':
		case 'core':
			return { group: 'core_vocab', targetChannel: 'meaning' };
		case 'pinyin':
		case 'listening':
		case 'pronunciation':
		case 'sound':
			return { group: 'sound', targetChannel: 'sound' };
		case 'sentence':
			return { group: 'sentence', targetChannel: 'sentence' };
		default:
			return { group: 'smart_mixed' };
	}
}

export function practiceIntervalIdxForChannel(
	progress: CnWordProgressDTO | null,
	channel: SkillChannel,
	fixedIntervalIdx?: number,
): number {
	if (fixedIntervalIdx !== undefined) return fixedIntervalIdx;
	return channelIntervalIdxForProgress(progress, channel);
}

export function channelIntervalIdxForProgress(
	progress: CnWordProgressDTO | null,
	channel: SkillChannel,
): number {
	return channelIntervalIdx(progress, channel);
}

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function channelRates(progress: CnWordProgressDTO | null): Record<SkillChannel, number | null> {
	if (!progress) {
		return { meaning: null, sound: null, sentence: null };
	}
	return {
		meaning: progress.meaningRate,
		sound: progress.soundRate,
		sentence: progress.sentenceRate,
	};
}

function channelIntervalIdx(progress: CnWordProgressDTO | null, channel: SkillChannel): number {
	if (!progress) return 0;
	switch (channel) {
		case 'meaning': return progress.meaningIntervalIdx;
		case 'sound': return progress.soundIntervalIdx;
		case 'sentence': return progress.sentenceIntervalIdx;
	}
}

/** All channels are always active in the minimal SRS model */
export function isChannelUnlocked(
	progress: CnWordProgressDTO | null,
	channel: SkillChannel,
): boolean {
	void progress;
	void channel;
	return true;
}

export function getUnlockedGroups(progress: CnWordProgressDTO | null): PracticeGroup[] {
	void progress;
	return ['core_vocab', 'sound', 'sentence'];
}

/** Pick a mixed question type for maintain stage (Lv6+) */
export function reviewQuestionTypeForMaintain(
	channel: SkillChannel,
	rng: () => number = Math.random,
): CnQuestionType {
	const roll = rng();
	switch (channel) {
		case 'meaning':
			return roll < 0.3 ? 'hanzi_to_meaning' : 'meaning_to_hanzi_typed';
		case 'sound':
			return roll < 0.3 ? 'sound_to_hanzi' : 'sound_to_hanzi_typed';
		case 'sentence':
			return roll < 0.3 ? 'fill_sentence' : 'fill_sentence_typed';
	}
}

/** Pick the review question type for a channel at its current SRS stage */
export function reviewQuestionTypeForChannel(
	channel: SkillChannel,
	intervalIdx: number,
	rng: () => number = Math.random,
): CnQuestionType {
	const stage = stageFromIntervalIdx(intervalIdx);
	switch (channel) {
		case 'meaning':
			if (stage === 'mcq1') return 'hanzi_to_meaning';
			if (stage === 'mcq2') return 'meaning_to_hanzi';
			if (stage === 'maintain') return reviewQuestionTypeForMaintain(channel, rng);
			return 'meaning_to_hanzi_typed';
		case 'sound':
			if (stage === 'mcq1' || stage === 'mcq2') return 'sound_to_hanzi';
			if (stage === 'maintain') return reviewQuestionTypeForMaintain(channel, rng);
			return 'sound_to_hanzi_typed';
		case 'sentence':
			if (stage === 'mcq1' || stage === 'mcq2') return 'fill_sentence';
			if (stage === 'maintain') return reviewQuestionTypeForMaintain(channel, rng);
			return 'fill_sentence_typed';
	}
}

/** Whether sound_to_hanzi MCQ should use harder distractors (mcq2 / maintain MCQ roll) */
export function soundMcqHardMode(intervalIdx: number, questionType: CnQuestionType): boolean {
	if (questionType !== 'sound_to_hanzi') return false;
	const stage = stageFromIntervalIdx(intervalIdx);
	return stage === 'mcq2' || stage === 'maintain';
}

function channelWeaknessScore(
	progress: CnWordProgressDTO | null,
	channel: SkillChannel,
	goalWeights: GoalWeights,
): number {
	const rates = channelRates(progress);
	const rate = rates[channel];
	const totals: Record<SkillChannel, number> = progress
		? {
			meaning: progress.meaningTotal,
			sound: progress.soundTotal,
			sentence: progress.sentenceTotal,
		}
		: { meaning: 0, sound: 0, sentence: 0 };
	const practiced = totals[channel] > 0;
	const effectiveRate = practiced && rate !== null ? rate : 0;
	return (100 - effectiveRate) * goalWeights[channel];
}

export function getWeakestChannel(
	progress: CnWordProgressDTO | null,
	goalWeights: GoalWeights = DEFAULT_GOAL_WEIGHTS,
): SkillChannel {
	const candidates = ALL_SKILL_CHANNELS;
	let weakest: SkillChannel = candidates[0];
	let maxScore = -1;

	for (const ch of candidates) {
		const weaknessScore = channelWeaknessScore(progress, ch, goalWeights);
		if (weaknessScore > maxScore) {
			maxScore = weaknessScore;
			weakest = ch;
		}
	}
	return weakest;
}

/** Weighted random channel pick for interleaving (favors weak channels, not 100%) */
export function pickChannelWeighted(
	progress: CnWordProgressDTO | null,
	channels: SkillChannel[],
	goalWeights: GoalWeights = DEFAULT_GOAL_WEIGHTS,
): SkillChannel {
	if (!channels.length) return 'meaning';
	if (channels.length === 1) return channels[0];

	const weights = channels.map((ch) => channelWeaknessScore(progress, ch, goalWeights) + 1);
	const total = weights.reduce((s, w) => s + w, 0);
	let roll = Math.random() * total;
	for (let i = 0; i < channels.length; i++) {
		roll -= weights[i];
		if (roll <= 0) return channels[i];
	}
	return channels[channels.length - 1];
}

function resolveAllowedGroups(
	group: PracticeGroup,
	progress: CnWordProgressDTO | null,
	goalWeights: GoalWeights,
): PracticeGroup[] {
	const unlocked = getUnlockedGroups(progress);
	if (group !== 'smart_mixed') {
		return unlocked.includes(group) ? [group] : unlocked;
	}

	const weakest = getWeakestChannel(progress, goalWeights);
	const priorityGroup = CHANNEL_TO_GROUP[weakest];
	const ordered = [priorityGroup, ...unlocked.filter((g) => g !== priorityGroup)];
	return [...new Set(ordered)];
}

function typesForGroups(groups: PracticeGroup[]): CnQuestionType[] {
	const types: CnQuestionType[] = [];
	for (const g of groups) {
		if (g === 'smart_mixed') continue;
		types.push(...GROUP_QUESTION_MAP[g]);
	}
	return [...new Set(types)];
}

function channelsForGroups(groups: PracticeGroup[]): SkillChannel[] {
	const channels: SkillChannel[] = [];
	for (const g of groups) {
		if (g === 'smart_mixed') continue;
		for (const ch of ALL_SKILL_CHANNELS) {
			if (CHANNEL_TO_GROUP[ch] === g && !channels.includes(ch)) {
				channels.push(ch);
			}
		}
	}
	return channels;
}

/** One stage-appropriate type per channel, in random channel order */
function stageTypesForChannels(
	progress: CnWordProgressDTO | null,
	channels: SkillChannel[],
): CnQuestionType[] {
	return shuffle(channels).map((ch) =>
		reviewQuestionTypeForChannel(ch, channelIntervalIdx(progress, ch)),
	);
}

function priorityTypeForChannel(
	progress: CnWordProgressDTO,
	channel: SkillChannel,
): CnQuestionType {
	return reviewQuestionTypeForChannel(channel, channelIntervalIdx(progress, channel));
}

function reorderWithPriorityType(types: CnQuestionType[], priorityType: CnQuestionType | null): CnQuestionType[] {
	if (!priorityType || !types.includes(priorityType)) {
		return shuffle(types);
	}
	const rest = types.filter((t) => t !== priorityType);
	return [priorityType, ...shuffle(rest)];
}

export function wordSupportsQuestionType(word: CnWordCardDTO, type: CnQuestionType): boolean {
	switch (type) {
		case 'hanzi_to_meaning':
		case 'meaning_to_hanzi':
		case 'meaning_to_hanzi_typed':
			return !!word.simplified && !!word.meaningVi;
		case 'sound_to_hanzi':
		case 'sound_to_hanzi_typed':
			return !!word.simplified && !!word.pinyin;
		case 'fill_sentence':
		case 'fill_sentence_typed':
			return !!word.simplified && !!pickFillExample(word);
		default:
			return false;
	}
}

export function selectQuestionTypesForWord(
	word: CnWordCardDTO,
	progress: CnWordProgressDTO | null,
	options: {
		group: PracticeGroup;
		goalWeights?: GoalWeights;
		count?: number;
		targetChannel?: SkillChannel;
		sessionContext?: SessionContext;
		fixedIntervalIdx?: number;
	},
): CnQuestionType[] {
	const {
		group,
		goalWeights = DEFAULT_GOAL_WEIGHTS,
		count = 3,
		targetChannel,
		fixedIntervalIdx,
	} = options;
	const allowedGroups = resolveAllowedGroups(group, progress, goalWeights);
	let types: CnQuestionType[];

	const sessionContext = options.sessionContext ?? 'practice';
	const channels = channelsForGroups(allowedGroups);

	if (progress) {
		types = stageTypesForChannels(progress, channels)
			.filter((t) => wordSupportsQuestionType(word, t));
	} else {
		types = typesForGroups(allowedGroups).filter((t) => wordSupportsQuestionType(word, t));
	}

	if (!types.length) {
		types = progress
			? stageTypesForChannels(progress, ['meaning', 'sound', 'sentence'])
				.filter((t) => wordSupportsQuestionType(word, t))
			: GROUP_QUESTION_MAP.core_vocab.filter((t) => wordSupportsQuestionType(word, t));
	}

	if (targetChannel && sessionContext === 'practice') {
		const reviewType = reviewQuestionTypeForChannel(
			targetChannel,
			practiceIntervalIdxForChannel(progress, targetChannel, fixedIntervalIdx),
		);
		return wordSupportsQuestionType(word, reviewType)
			? [reviewType]
			: [];
	}

	if (targetChannel) {
		const reviewType = reviewQuestionTypeForChannel(
			targetChannel,
			practiceIntervalIdxForChannel(progress, targetChannel, fixedIntervalIdx),
		);
		types = reorderWithPriorityType(
			types,
			wordSupportsQuestionType(word, reviewType) ? reviewType : null,
		);
	} else if (sessionContext === 'practice' && group === 'smart_mixed') {
		types = shuffle(types);
	} else if (progress?.state === 'weak') {
		const weakest = getWeakestChannel(progress, goalWeights);
		types = reorderWithPriorityType(types, priorityTypeForChannel(progress, weakest));
	} else if (group === 'smart_mixed' && progress) {
		const weakest = getWeakestChannel(progress, goalWeights);
		types = reorderWithPriorityType(types, priorityTypeForChannel(progress, weakest));
	} else {
		types = shuffle(types);
	}

	return types.slice(0, Math.max(1, count));
}

export type ChannelMasteryLevel = 'not_practiced' | 'weak' | 'ok' | 'good';

export function channelMasteryLevel(rate: number, totalAttempts: number): ChannelMasteryLevel {
	if (totalAttempts <= 0) return 'not_practiced';
	if (rate < WEAK_MASTERY_THRESHOLD) return 'weak';
	if (rate < 85) return 'ok';
	return 'good';
}

export function channelMasteryLabel(level: ChannelMasteryLevel): string {
	const labels: Record<ChannelMasteryLevel, string> = {
		not_practiced: 'Chưa luyện',
		weak: 'Yếu',
		ok: 'Ổn',
		good: 'Tốt',
	};
	return labels[level];
}
