import { ALL_SKILL_CHANNELS } from '@/lib/chinese/practiceTaxonomy';

/** `dueCount` on set list DTOs counts due SRS channels (up to 3 per word), not words. */
export function maxSrsChannelsForSet(itemCount: number): number {
	return itemCount * ALL_SKILL_CHANNELS.length;
}

/** Progress 0–100: share of channels not due today. Never negative. */
export function computeSetChannelProgress(itemCount: number, dueChannelCount: number): number {
	const maxChannels = maxSrsChannelsForSet(itemCount);
	if (maxChannels <= 0) return 0;
	return Math.max(
		0,
		Math.min(100, Math.round((1 - dueChannelCount / maxChannels) * 100)),
	);
}

export function formatSetDueChannelsLabel(dueChannelCount: number): string {
	return `${dueChannelCount} kênh cần ôn`;
}
