/* ════════════════════════════════════════════════════════════════════════
   practiceTaxonomy.ts — Skill groups, channel unlock, smart question selection
   ════════════════════════════════════════════════════════════════════════ */
import { stageFromIntervalIdx } from '@/config/constants';
import {
	ALL_SKILL_CHANNELS,
	questionChannel,
	type SkillChannel,
} from '@/lib/chinese/coreQuestionTypes';
import type {
	CnQuestionType,
	CnWordCardDTO,
	CnWordProgressDTO,
} from '@/types/chinese';

export type { SkillChannel };
export { ALL_SKILL_CHANNELS, questionChannel };

export type PracticeGroup =
	| 'core_vocab'
	| 'listening'
	| 'smart_mixed';

export type SessionContext = 'review' | 'practice';

export interface GoalWeights {
	meaning: number;
	listening: number;
	pinyin: number;
}

export const DEFAULT_GOAL_WEIGHTS: GoalWeights = {
	meaning: 40,
	listening: 35,
	pinyin: 25,
};

export const GROUP_QUESTION_MAP: Record<Exclude<PracticeGroup, 'smart_mixed'>, CnQuestionType[]> = {
	core_vocab: ['hanzi_to_meaning', 'meaning_to_hanzi', 'pinyin_to_hanzi', 'hanzi_to_pinyin'],
	listening: ['audio_to_meaning', 'audio_to_hanzi'],
};

export const CHANNEL_TO_GROUP: Record<SkillChannel, Exclude<PracticeGroup, 'smart_mixed'>> = {
	meaning: 'core_vocab',
	listening: 'listening',
	pinyin: 'core_vocab',
};

const WEAK_MASTERY_THRESHOLD = 60;

export function practiceModeToGroup(mode: string): PracticeGroup {
	const normalized = mode.trim().toLowerCase();
	const map: Record<string, PracticeGroup> = {
		mixed: 'smart_mixed',
		smart_mixed: 'smart_mixed',
		core_vocab: 'core_vocab',
		core: 'core_vocab',
		listening: 'listening',
	};
	return map[normalized] ?? 'smart_mixed';
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
		return { meaning: null, listening: null, pinyin: null };
	}
	return {
		meaning: progress.meaningRate,
		listening: progress.listeningRate,
		pinyin: progress.pinyinRate,
	};
}

function channelIntervalIdx(progress: CnWordProgressDTO | null, channel: SkillChannel): number {
	if (!progress) return 0;
	switch (channel) {
		case 'meaning': return progress.meaningIntervalIdx;
		case 'listening': return progress.listeningIntervalIdx;
		case 'pinyin': return progress.pinyinIntervalIdx;
	}
}

/** All three channels are always active in the minimal SRS model */
export function isChannelUnlocked(
	_progress: CnWordProgressDTO | null,
	_channel: SkillChannel,
): boolean {
	return true;
}

export function getUnlockedGroups(_progress: CnWordProgressDTO | null): PracticeGroup[] {
	return ['core_vocab', 'listening'];
}

/** Pick the review question type for a channel at its current SRS stage */
export function reviewQuestionTypeForChannel(
	channel: SkillChannel,
	intervalIdx: number,
): CnQuestionType {
	const stage = stageFromIntervalIdx(intervalIdx);
	switch (channel) {
		case 'meaning':
			if (stage === 'mcq1') return 'hanzi_to_meaning';
			if (stage === 'mcq2') return 'meaning_to_hanzi';
			return 'meaning_to_hanzi_typed';
		case 'pinyin':
			if (stage === 'mcq1') return 'pinyin_to_hanzi';
			if (stage === 'mcq2') return 'hanzi_to_pinyin';
			return 'hanzi_to_pinyin_typed';
		case 'listening':
			if (stage === 'mcq1') return 'audio_to_meaning';
			if (stage === 'mcq2') return 'audio_to_hanzi';
			return 'audio_to_hanzi_typed';
	}
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
			listening: progress.listeningTotal,
			pinyin: progress.pinyinTotal,
		}
		: { meaning: 0, listening: 0, pinyin: 0 };
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

export function wordSupportsQuestionType(word: CnWordCardDTO, type: CnQuestionType): boolean {
	switch (type) {
		case 'hanzi_to_meaning':
		case 'meaning_to_hanzi':
		case 'meaning_to_hanzi_typed':
			return !!word.simplified && !!word.meaningVi;
		case 'pinyin_to_hanzi':
		case 'hanzi_to_pinyin':
		case 'hanzi_to_pinyin_typed':
		case 'audio_to_hanzi':
		case 'audio_to_hanzi_typed':
		case 'audio_to_meaning':
			return !!word.simplified && !!word.pinyin;
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
	},
): CnQuestionType[] {
	const {
		group,
		goalWeights = DEFAULT_GOAL_WEIGHTS,
		count = 3,
		targetChannel,
	} = options;
	const allowedGroups = resolveAllowedGroups(group, progress, goalWeights);
	let types = typesForGroups(allowedGroups).filter((t) => wordSupportsQuestionType(word, t));

	if (!types.length) {
		types = GROUP_QUESTION_MAP.core_vocab.filter((t) => wordSupportsQuestionType(word, t));
	}

	if (targetChannel) {
		const reviewType = reviewQuestionTypeForChannel(
			targetChannel,
			channelIntervalIdx(progress, targetChannel),
		);
		if (wordSupportsQuestionType(word, reviewType)) {
			types = [reviewType, ...types.filter((t) => t !== reviewType)];
		}
		const priorityGroup = CHANNEL_TO_GROUP[targetChannel];
		const priorityTypes = GROUP_QUESTION_MAP[priorityGroup].filter((t) => types.includes(t));
		const rest = types.filter((t) => !priorityTypes.includes(t));
		types = [...shuffle(priorityTypes), ...shuffle(rest)];
	} else if (progress?.state === 'weak') {
		const weakest = getWeakestChannel(progress, goalWeights);
		const priorityGroup = CHANNEL_TO_GROUP[weakest];
		const priorityTypes = GROUP_QUESTION_MAP[priorityGroup];
		const rest = types.filter((t) => !priorityTypes.includes(t));
		types = [...shuffle(priorityTypes), ...shuffle(rest)];
	} else if (group === 'smart_mixed' && progress) {
		const weakest = getWeakestChannel(progress, goalWeights);
		const priorityGroup = CHANNEL_TO_GROUP[weakest];
		const priorityTypes = GROUP_QUESTION_MAP[priorityGroup].filter((t) => types.includes(t));
		const rest = types.filter((t) => !priorityTypes.includes(t));
		types = [...shuffle(priorityTypes), ...shuffle(rest)];
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
