/* ════════════════════════════════════════════════════════════════════════
   practiceTaxonomy.ts — Skill groups, channel unlock, smart question selection
   ════════════════════════════════════════════════════════════════════════ */
import { CN_STATE_THRESHOLDS } from '@/config/constants';
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
	| 'listening'
	| 'sentence_usage'
	| 'smart_mixed';

export type SessionContext = 'review' | 'practice';

export interface GoalWeights {
	meaning: number;
	listening: number;
	pinyin: number;
	sentence: number;
}

export const DEFAULT_GOAL_WEIGHTS: GoalWeights = {
	meaning: 38,
	listening: 32,
	pinyin: 15,
	sentence: 15,
};

export const GROUP_QUESTION_MAP: Record<Exclude<PracticeGroup, 'smart_mixed'>, CnQuestionType[]> = {
	core_vocab: ['hanzi_to_meaning', 'meaning_to_hanzi', 'pinyin_to_hanzi'],
	listening: ['audio_to_meaning', 'audio_to_hanzi'],
	sentence_usage: ['fill_sentence'],
};

export const CHANNEL_TO_GROUP: Record<SkillChannel, Exclude<PracticeGroup, 'smart_mixed'>> = {
	meaning: 'core_vocab',
	listening: 'listening',
	pinyin: 'core_vocab',
	sentence: 'sentence_usage',
};

const WEAK_MASTERY_THRESHOLD = 60;

const ALWAYS_UNLOCKED_CHANNELS: ReadonlySet<SkillChannel> = new Set([
	'meaning', 'listening', 'pinyin',
]);

export function practiceModeToGroup(mode: string): PracticeGroup {
	const normalized = mode.trim().toLowerCase();
	const map: Record<string, PracticeGroup> = {
		mixed: 'smart_mixed',
		smart_mixed: 'smart_mixed',
		core_vocab: 'core_vocab',
		core: 'core_vocab',
		listening: 'listening',
		sentence: 'sentence_usage',
		sentence_usage: 'sentence_usage',
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
		return { meaning: null, listening: null, pinyin: null, sentence: null };
	}
	return {
		meaning: progress.meaningRate,
		listening: progress.listeningRate,
		pinyin: progress.pinyinRate,
		sentence: progress.sentenceRate,
	};
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

/** Sentence channel unlocks when meaning channel reaches familiar threshold */
export function isChannelUnlocked(
	progress: CnWordProgressDTO | null,
	channel: SkillChannel,
): boolean {
	if (ALWAYS_UNLOCKED_CHANNELS.has(channel)) return true;
	return channelIntervalIdx(progress, 'meaning') >= CN_STATE_THRESHOLDS.familiar;
}

export function getUnlockedGroups(progress: CnWordProgressDTO | null): PracticeGroup[] {
	const groups: PracticeGroup[] = ['core_vocab', 'listening'];
	if (isChannelUnlocked(progress, 'sentence')) groups.push('sentence_usage');
	if (progress?.state === 'mastered') {
		return groups.filter((g) => g !== 'core_vocab');
	}
	return [...new Set(groups)];
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
			sentence: progress.sentenceTotal,
		}
		: { meaning: 0, listening: 0, pinyin: 0, sentence: 0 };
	const practiced = totals[channel] > 0;
	const effectiveRate = practiced && rate !== null ? rate : 0;
	let score = (100 - effectiveRate) * goalWeights[channel];
	if (channel === 'sentence' && totals.sentence < 3) score *= 0.4;
	else if (channel === 'sentence' && totals.sentence < 10) score *= 0.7;
	return score;
}

export function getWeakestChannel(
	progress: CnWordProgressDTO | null,
	goalWeights: GoalWeights = DEFAULT_GOAL_WEIGHTS,
): SkillChannel {
	const candidates = ALL_SKILL_CHANNELS.filter((ch) => isChannelUnlocked(progress, ch));
	if (!candidates.length) return 'meaning';

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
	const unlocked = channels.filter((ch) => isChannelUnlocked(progress, ch));
	if (!unlocked.length) return 'meaning';
	if (unlocked.length === 1) return unlocked[0];

	const weights = unlocked.map((ch) => channelWeaknessScore(progress, ch, goalWeights) + 1);
	const total = weights.reduce((s, w) => s + w, 0);
	let roll = Math.random() * total;
	for (let i = 0; i < unlocked.length; i++) {
		roll -= weights[i];
		if (roll <= 0) return unlocked[i];
	}
	return unlocked[unlocked.length - 1];
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
		case 'fill_sentence':
			return pickFillExample(word) != null;
		case 'hanzi_to_meaning':
		case 'meaning_to_hanzi':
			return !!word.simplified && !!word.meaningVi;
		case 'pinyin_to_hanzi':
		case 'audio_to_hanzi':
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

	if (targetChannel && isChannelUnlocked(progress, targetChannel)) {
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
