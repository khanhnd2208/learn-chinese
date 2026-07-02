/* ════════════════════════════════════════════════════════════════════════
   cnAdminAnalyticsService.ts — cross-user practice analytics for admin
   ════════════════════════════════════════════════════════════════════════ */
import { groupLogsIntoSessions } from '@/lib/chinese/groupAnswerSessions';
import { rate } from '@/lib/chinese/hanziUtils';
import { listMongoUsers } from '@/lib/chinese/mongoUsers';
import {
	computeStreak,
	localDayKey,
	startOfLocalDay,
} from '@/lib/chinese/reviewMetrics';
import { prisma } from '@/lib/prisma';
import type {
	CnAdminAnalyticsDTO,
	CnAdminSourceBreakdownDTO,
	CnAdminUserActivityDTO,
	CnReviewDailyActivityDTO,
} from '@/types/chinese';

const HISTORY_DAYS = 30;

type AnswerLogRow = {
	userId: string;
	correct: boolean;
	source: string;
	createdAt: Date;
};

function emptySourceBreakdown(): CnAdminSourceBreakdownDTO {
	return { review: 0, practice: 0, inferno: 0, other: 0 };
}

function addToSourceBreakdown(
	breakdown: CnAdminSourceBreakdownDTO,
	source: string,
): void {
	if (source === 'review' || source === 'mark_known') breakdown.review++;
	else if (source === 'practice') breakdown.practice++;
	else if (source === 'inferno') breakdown.inferno++;
	else breakdown.other++;
}

function countActiveDays(logs: AnswerLogRow[], since: Date): number {
	const days = new Set<string>();
	for (const log of logs) {
		if (log.createdAt >= since) days.add(localDayKey(log.createdAt));
	}
	return days.size;
}

function filterSince(logs: AnswerLogRow[], since: Date): AnswerLogRow[] {
	return logs.filter((l) => l.createdAt >= since);
}

function buildUserActivity(
	userId: string,
	name: string,
	email: string,
	logs: AnswerLogRow[],
	now: Date,
	sevenDaysAgo: Date,
	thirtyDaysAgo: Date,
): CnAdminUserActivityDTO {
	const logs7d = filterSince(logs, sevenDaysAgo);
	const logs30d = filterSince(logs, thirtyDaysAgo);

	const sourceBreakdown = emptySourceBreakdown();
	for (const log of logs30d) addToSourceBreakdown(sourceBreakdown, log.source);

	const dayKeys = [...new Set(logs30d.map((l) => localDayKey(l.createdAt)))].sort();
	const streak = computeStreak(dayKeys, now);

	const sessions7d = groupLogsIntoSessions(logs7d).length;
	const correct30d = logs30d.filter((l) => l.correct).length;

	const lastLog = logs[0] ?? null;

	return {
		userId,
		name,
		email,
		answers7d: logs7d.length,
		answers30d: logs30d.length,
		activeDays7d: countActiveDays(logs, sevenDaysAgo),
		activeDays30d: countActiveDays(logs, thirtyDaysAgo),
		streak,
		lastActiveAt: lastLog?.createdAt.toISOString() ?? null,
		sessions7d,
		avgItemsPerSession: sessions7d > 0 ? Math.round((logs7d.length / sessions7d) * 10) / 10 : 0,
		accuracy30d: rate(correct30d, logs30d.length),
		sourceBreakdown,
	};
}

function buildDailySeries(logs: AnswerLogRow[]): CnReviewDailyActivityDTO[] {
	const map = new Map<string, { reviewed: number; correct: number }>();
	for (const log of logs) {
		const dayKey = localDayKey(log.createdAt);
		const row = map.get(dayKey) ?? { reviewed: 0, correct: 0 };
		row.reviewed++;
		if (log.correct) row.correct++;
		map.set(dayKey, row);
	}
	return [...map.entries()]
		.map(([dayKey, row]) => ({ dayKey, ...row }))
		.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

function countActiveUsers(logs: AnswerLogRow[], since: Date): number {
	const users = new Set<string>();
	for (const log of logs) {
		if (log.createdAt >= since) users.add(log.userId);
	}
	return users.size;
}

export async function getAdminPracticeAnalytics(): Promise<CnAdminAnalyticsDTO> {
	const now = new Date();
	const todayStart = startOfLocalDay(now);
	const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
	const thirtyDaysAgo = new Date(now.getTime() - HISTORY_DAYS * 86_400_000);

	const [logs, mongoUsers] = await Promise.all([
		prisma.cnAnswerLog.findMany({
			where: { createdAt: { gte: thirtyDaysAgo } },
			orderBy: { createdAt: 'desc' },
			select: {
				userId: true,
				correct: true,
				source: true,
				createdAt: true,
			},
		}),
		listMongoUsers(),
	]);

	const logsByUser = new Map<string, AnswerLogRow[]>();
	for (const log of logs) {
		const bucket = logsByUser.get(log.userId) ?? [];
		bucket.push(log);
		logsByUser.set(log.userId, bucket);
	}

	const userProfiles = new Map(mongoUsers.map((u) => [u.id, u]));

	const users: CnAdminUserActivityDTO[] = mongoUsers.map((profile) => {
		const userLogs = logsByUser.get(profile.id) ?? [];
		return buildUserActivity(
			profile.id,
			profile.name,
			profile.email,
			userLogs,
			now,
			sevenDaysAgo,
			thirtyDaysAgo,
		);
	});

	// Include users with activity but not in mongo list (edge case)
	for (const [userId, userLogs] of logsByUser) {
		if (userProfiles.has(userId)) continue;
		users.push(buildUserActivity(userId, '', '', userLogs, now, sevenDaysAgo, thirtyDaysAgo));
	}

	users.sort((a, b) => b.answers7d - a.answers7d);

	const sourceBreakdown = emptySourceBreakdown();
	for (const log of logs) addToSourceBreakdown(sourceBreakdown, log.source);

	const logs7d = filterSince(logs, sevenDaysAgo);

	return {
		activeToday: countActiveUsers(logs, todayStart),
		active7d: countActiveUsers(logs, sevenDaysAgo),
		active30d: countActiveUsers(logs, thirtyDaysAgo),
		totalAnswers7d: logs7d.length,
		totalAnswers30d: logs.length,
		sourceBreakdown,
		dailySeries: buildDailySeries(logs),
		users,
	};
}
