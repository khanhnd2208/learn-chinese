import { describe, expect, it } from 'vitest';
import { formatReviewScheduleLabel } from '@/lib/chinese/reviewMetrics';
import { computeNextReview } from '@/lib/chinese/srsSchedule';

function labelFromDueAt(dueAt: Date, now: Date, correct: boolean): string {
	const prefix = correct ? 'Gặp lại sau' : 'Hẹn lại sau';
	const diffMs = dueAt.getTime() - now.getTime();
	const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
	if (diffMinutes < 60) return `${prefix} ${diffMinutes} phút`;
	const diffHours = Math.round(diffMs / 3_600_000);
	if (diffHours < 24) return `${prefix} ${diffHours} giờ`;
	const diffDays = Math.max(1, Math.round(diffMs / 86_400_000));
	return `${prefix} ${diffDays} ngày`;
}

describe('srsSchedule', () => {
	const now = new Date('2026-06-17T10:00:00Z');

	it('keeps the UI label equal to the backend dueAt for every ladder step', () => {
		for (let intervalIdx = 0; intervalIdx <= 5; intervalIdx++) {
			for (const correct of [true, false]) {
				const { dueAt } = computeNextReview({ intervalIdx, correct, now });
				expect(formatReviewScheduleLabel(intervalIdx, correct, now)).toBe(
					labelFromDueAt(dueAt, now, correct),
				);
			}
		}
	});
});
