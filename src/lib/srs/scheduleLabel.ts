/** Shared review-date label. The due instant comes from the language's ladder step. */
export function formatScheduleDistance(dueAt: Date, now: Date, correct: boolean): string {
	const prefix = correct ? 'Gặp lại sau' : 'Hẹn lại sau';
	const diffMs = dueAt.getTime() - now.getTime();
	const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
	if (diffMinutes < 60) return `${prefix} ${diffMinutes} phút`;
	const diffHours = Math.round(diffMs / 3_600_000);
	if (diffHours < 24) return `${prefix} ${diffHours} giờ`;
	const diffDays = Math.max(1, Math.round(diffMs / 86_400_000));
	return `${prefix} ${diffDays} ngày`;
}
