/* ════════════════════════════════════════════════════════════════════════
   channelRamp.ts — All channels active from enrollment (minimal SRS)
   ════════════════════════════════════════════════════════════════════════ */
import type { SkillChannel } from '@/lib/chinese/coreQuestionTypes';
import type { CnWordProgress } from '@prisma/client';

/** All three channels are always eligible in the minimal SRS model */
export function isChannelRampEligible(p: CnWordProgress, channel: SkillChannel): boolean {
	void p;
	void channel;
	return true;
}
