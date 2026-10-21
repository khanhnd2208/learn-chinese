import {
	CN_EXAMPLE_FLAG_DISPUTE_USERS,
	CN_EXAMPLE_FLAG_MAX_CLEAN_RATE,
	CN_EXAMPLE_FLAG_MIN_ATTEMPTS,
} from '@/config/constants';

export interface ExampleAttempt {
	userId: string;
	createdAt: Date;
	correct: boolean;
	hintUsed: boolean;
	answer: string | null;
}

export interface ExampleQualityScore {
	attempts: number;
	cleanRate: number;
	revealRate: number;
	wrongRate: number;
	disputeUsers: number;
	topWrongAnswers: string[];
	flagged: boolean;
}

/** Keep the earliest answer from each learner so repeated reviews do not skew the sentence. */
export function firstAttemptPerUser(rows: ExampleAttempt[]): ExampleAttempt[] {
	const first = new Map<string, ExampleAttempt>();
	for (const row of rows) {
		const current = first.get(row.userId);
		if (!current || row.createdAt < current.createdAt) first.set(row.userId, row);
	}
	return [...first.values()];
}

export function scoreExample(rows: ExampleAttempt[], disputeUserIds: string[]): ExampleQualityScore {
	const attempts = firstAttemptPerUser(rows);
	const total = attempts.length;
	const clean = attempts.filter((row) => row.correct && !row.hintUsed).length;
	const revealed = attempts.filter((row) => row.hintUsed).length;
	const wrong = attempts.filter((row) => !row.correct).length;
	const wrongCounts = new Map<string, number>();
	for (const row of attempts) {
		if (row.correct || !row.answer) continue;
		wrongCounts.set(row.answer, (wrongCounts.get(row.answer) ?? 0) + 1);
	}
	const topWrongAnswers = [...wrongCounts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, 3)
		.map(([answer]) => answer);
	const disputeUsers = new Set(disputeUserIds).size;
	const cleanRate = total ? clean / total : 0;
	const flagged = (total >= CN_EXAMPLE_FLAG_MIN_ATTEMPTS && cleanRate < CN_EXAMPLE_FLAG_MAX_CLEAN_RATE)
		|| disputeUsers >= CN_EXAMPLE_FLAG_DISPUTE_USERS;
	return {
		attempts: total,
		cleanRate,
		revealRate: total ? revealed / total : 0,
		wrongRate: total ? wrong / total : 0,
		disputeUsers,
		topWrongAnswers,
		flagged,
	};
}
