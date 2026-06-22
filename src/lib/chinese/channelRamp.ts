/* ════════════════════════════════════════════════════════════════════════
   channelRamp.ts — Gradual channel introduction for new words
   ════════════════════════════════════════════════════════════════════════ */
import { CN_RAMP_MEANING_INTERVAL_IDX } from '@/config/constants';
import type { SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import type { CnWordProgress } from '@prisma/client';

/** listening/pinyin open after meaning reaches this interval index */
export function isChannelRampEligible(p: CnWordProgress, channel: SkillChannel): boolean {
	if (channel === 'meaning') return true;
	if (channel === 'listening' || channel === 'pinyin') {
		const totalField = channel === 'listening' ? 'listeningTotal' : 'pinyinTotal';
		if ((p[totalField] as number) > 0) return true;
		return p.meaningIntervalIdx >= CN_RAMP_MEANING_INTERVAL_IDX;
	}
	return true;
}
