/* ════════════════════════════════════════════════════════════════════════
   channelRamp.ts — Open sound and sentence only after meaning progress
   ════════════════════════════════════════════════════════════════════════ */
import {
	CN_UNLOCK_SENTENCE_AT_MEANING_IDX,
	CN_UNLOCK_SOUND_AT_MEANING_IDX,
} from '@/config/constants';
import type { SkillChannel } from '@/lib/chinese/coreQuestionTypes';

export interface ChannelRampProgress {
	introducedAt: Date | null;
	meaningIntervalIdx: number;
	meaningTotal: number;
	soundTotal: number;
	sentenceTotal: number;
}

function channelTotal(
	p: Pick<ChannelRampProgress, 'meaningTotal' | 'soundTotal' | 'sentenceTotal'>,
	channel: SkillChannel,
): number {
	if (channel === 'meaning') return p.meaningTotal;
	if (channel === 'sound') return p.soundTotal;
	return p.sentenceTotal;
}

/** Level gate after a word has been introduced. A practiced channel stays open. */
export function isChannelOpenForLevel(
	p: Pick<ChannelRampProgress, 'meaningIntervalIdx' | 'meaningTotal' | 'soundTotal' | 'sentenceTotal'>,
	channel: SkillChannel,
): boolean {
	if (channelTotal(p, channel) > 0) return true;
	if (channel === 'meaning') return true;
	if (channel === 'sound') return p.meaningIntervalIdx >= CN_UNLOCK_SOUND_AT_MEANING_IDX;
	return p.meaningIntervalIdx >= CN_UNLOCK_SENTENCE_AT_MEANING_IDX;
}

export function isChannelRampEligible(p: ChannelRampProgress, channel: SkillChannel): boolean {
	if (channelTotal(p, channel) > 0) return true;
	if (p.introducedAt == null) return false;
	return isChannelOpenForLevel(p, channel);
}
