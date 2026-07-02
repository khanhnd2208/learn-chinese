import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnAnswerLog: { findMany: vi.fn() },
	},
}));

vi.mock('@/lib/chinese/mongoUsers', () => ({
	listMongoUsers: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { listMongoUsers } from '@/lib/chinese/mongoUsers';
import { getAdminPracticeAnalytics } from '@/services/chinese/cnAdminAnalyticsService';

const mockAnswerLogFindMany = vi.mocked(prisma.cnAnswerLog.findMany);
const mockListMongoUsers = vi.mocked(listMongoUsers);

describe('getAdminPracticeAnalytics', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockListMongoUsers.mockResolvedValue([
			{ id: 'u1', name: 'Alice', email: 'alice@test.com' },
			{ id: 'u2', name: 'Bob', email: 'bob@test.com' },
		]);
	});

	it('aggregates per-user answer counts and sorts by 7d activity', async () => {
		const now = new Date();
		const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);
		const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000);

		mockAnswerLogFindMany.mockResolvedValue([
			{ userId: 'u1', correct: true, source: 'review', createdAt: now },
			{ userId: 'u1', correct: false, source: 'review', createdAt: twoDaysAgo },
			{ userId: 'u1', correct: true, source: 'inferno', createdAt: twoDaysAgo },
			{ userId: 'u2', correct: true, source: 'practice', createdAt: tenDaysAgo },
		] as never);

		const analytics = await getAdminPracticeAnalytics();

		expect(analytics.totalAnswers30d).toBe(4);
		expect(analytics.users[0].userId).toBe('u1');
		expect(analytics.users[0].answers7d).toBe(3);
		expect(analytics.users[0].sourceBreakdown.review).toBe(2);
		expect(analytics.users[0].sourceBreakdown.inferno).toBe(1);
		expect(analytics.users[1].answers7d).toBe(0);
		expect(analytics.sourceBreakdown.practice).toBe(1);
	});

	it('builds daily series from answer logs', async () => {
		const now = new Date();
		mockAnswerLogFindMany.mockResolvedValue([
			{ userId: 'u1', correct: true, source: 'review', createdAt: now },
			{ userId: 'u1', correct: true, source: 'review', createdAt: now },
		] as never);

		const analytics = await getAdminPracticeAnalytics();
		expect(analytics.dailySeries.length).toBe(1);
		expect(analytics.dailySeries[0].reviewed).toBe(2);
		expect(analytics.dailySeries[0].correct).toBe(2);
	});
});
