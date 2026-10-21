import { describe, expect, it } from 'vitest';
import { addDays, addMinutes, CN_SRS_INTERVAL_DAYS, CN_WRONG_FIRST_RETRY_MINUTES } from '@/config/constants';
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

	it('keeps the same step for one day when a correct answer used a hint', () => {
		const next = computeNextReview({ intervalIdx: 3, correct: true, hintUsed: true, now });
		expect(next.intervalIdx).toBe(3);
		expect(next.dueAt.getTime()).toBe(addDays(now, 1).getTime());
	});

	it('extends a correct answer past 30 days up to 120 days', () => {
		const next = computeNextReview({ intervalIdx: 5, correct: true, now });
		expect(next.intervalIdx).toBe(6);
		expect(next.dueAt.getTime()).toBe(addDays(now, 60).getTime());

		const last = CN_SRS_INTERVAL_DAYS.length - 1;
		const capped = computeNextReview({ intervalIdx: last, correct: true, now });
		expect(capped.intervalIdx).toBe(last);
		expect(capped.dueAt.getTime()).toBe(addDays(now, CN_SRS_INTERVAL_DAYS[last]).getTime());
	});

	it('sends a maintain miss back to Recall in one day', () => {
		const at30 = computeNextReview({ intervalIdx: 5, correct: false, now });
		expect(at30.intervalIdx).toBe(2);
		expect(at30.dueAt.getTime()).toBe(addDays(now, 1).getTime());

		const at7 = computeNextReview({ intervalIdx: 3, correct: false, now });
		expect(at7.intervalIdx).toBe(2);
	});

	it('sends an MCQ2 miss back to MCQ1 in 30 minutes', () => {
		const next = computeNextReview({ intervalIdx: 1, correct: false, now });
		expect(next.intervalIdx).toBe(0);
		expect(next.dueAt.getTime()).toBe(addMinutes(now, CN_WRONG_FIRST_RETRY_MINUTES).getTime());
	});

	it('keeps the UI label equal to the backend dueAt for every ladder step', () => {
		for (let intervalIdx = 0; intervalIdx < CN_SRS_INTERVAL_DAYS.length; intervalIdx++) {
			for (const correct of [true, false]) {
				const { dueAt } = computeNextReview({ intervalIdx, correct, now });
				expect(formatReviewScheduleLabel(intervalIdx, correct, now)).toBe(
					labelFromDueAt(dueAt, now, correct),
				);
			}
		}
	});
});
