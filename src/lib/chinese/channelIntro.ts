/* ════════════════════════════════════════════════════════════════════════
   channelIntro.ts — Gradual introduction for newly unlocked channels
   ════════════════════════════════════════════════════════════════════════ */
import {
	CN_INTRO_DAYS,
	CN_INTRO_MAX_TOTAL,
	CN_INTRO_RAMP_TOTAL,
} from '@/config/constants';
import type { SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import type { CnWordProgress } from '@prisma/client';

const INTRO_CHANNELS: ReadonlySet<SkillChannel> = new Set(['sentence']);

export function localDayKey(date = new Date()): string {
	const d = new Date(date);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function totalField(channel: SkillChannel): keyof CnWordProgress {
	const map: Record<SkillChannel, keyof CnWordProgress> = {
		meaning: 'meaningTotal',
		listening: 'listeningTotal',
		pinyin: 'pinyinTotal',
		sentence: 'sentenceTotal',
	};
	return map[channel];
}

export type ChannelIntroPhase = 'intro' | 'ramp' | 'full';

export function getChannelIntroPhase(
	p: CnWordProgress,
	channel: SkillChannel,
	now = new Date(),
): ChannelIntroPhase {
	if (!INTRO_CHANNELS.has(channel)) return 'full';
	if (!(p.sentenceUnlockedAt instanceof Date)) return 'full';

	const daysSince = (now.getTime() - p.sentenceUnlockedAt.getTime()) / 86_400_000;
	const total = p[totalField(channel)] as number;

	if (daysSince <= CN_INTRO_DAYS && total < CN_INTRO_MAX_TOTAL) return 'intro';
	if (total < CN_INTRO_RAMP_TOTAL) return 'ramp';
	return 'full';
}

export function introPriorityMultiplier(phase: ChannelIntroPhase): number {
	if (phase === 'intro') return 0.4;
	if (phase === 'ramp') return 0.7;
	return 1;
}

export function isIntroChannelDueToday(
	p: CnWordProgress,
	channel: SkillChannel,
	now = new Date(),
): boolean {
	const phase = getChannelIntroPhase(p, channel, now);
	if (phase !== 'intro') return true;

	const dayKey = localDayKey(now);
	if (channel === 'sentence') {
		if (p.sentenceIntroDayKey === dayKey && p.sentenceIntroDayCount >= 1) return false;
	}
	return true;
}

export function bumpIntroDayCount(p: CnWordProgress, channel: SkillChannel, now = new Date()): void {
	const phase = getChannelIntroPhase(p, channel, now);
	if (phase !== 'intro') return;
	const dayKey = localDayKey(now);
	if (channel === 'sentence') {
		if (p.sentenceIntroDayKey !== dayKey) {
			p.sentenceIntroDayKey = dayKey;
			p.sentenceIntroDayCount = 1;
		} else {
			p.sentenceIntroDayCount += 1;
		}
	}
}

export function maybeSetChannelUnlocked(
	p: CnWordProgress,
	channel: SkillChannel,
	now: Date,
): void {
	if (channel !== 'sentence') return;
	if (p.meaningIntervalIdx < 2) return;
	if (!p.sentenceUnlockedAt) {
		p.sentenceUnlockedAt = now;
	}
}
