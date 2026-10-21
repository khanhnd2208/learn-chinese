/** Counts for one word set. `dueChannels` is word×channel pairs, not words. */
export interface SetLearningSnapshot {
	introduced: number;
	mastered: number;
	total: number;
	dueChannels: number;
}

export function masteredSharePct(snapshot: SetLearningSnapshot): number {
	if (snapshot.total <= 0) return 0;
	return Math.max(0, Math.min(100, Math.round((snapshot.mastered / snapshot.total) * 100)));
}

export function formatIntroducedLabel(snapshot: SetLearningSnapshot): string {
	return `Đã học ${snapshot.introduced}/${snapshot.total} từ`;
}

export function formatMasteredLabel(snapshot: SetLearningSnapshot): string {
	return `Đã nắm ${snapshot.mastered}/${snapshot.total}`;
}

export function formatSetDueChannelsLabel(dueChannelCount: number): string {
	return `${dueChannelCount} kênh cần ôn`;
}
