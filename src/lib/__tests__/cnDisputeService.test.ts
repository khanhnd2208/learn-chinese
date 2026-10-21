import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CnPracticeSubmitItem } from '@/types/chinese';

const store = vi.hoisted(() => ({
	disputes: [] as Array<{
		userId: string;
		clientAnswerId: string | null;
		exampleId: string;
		wordId: string;
		answer: string;
		createdAt: Date;
	}>,
	examples: [] as Array<{ id: string; wordId: string; ownerUserId: string | null }>,
}));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnExample: {
			findMany: vi.fn(async ({ where }: { where: { id: { in: string[] }; OR: Array<{ ownerUserId: string | null }> } }) => {
				const owners = new Set(where.OR.map((clause) => clause.ownerUserId));
				return store.examples.filter((row) => where.id.in.includes(row.id) && owners.has(row.ownerUserId));
			}),
		},
		cnExampleDispute: {
			count: vi.fn(async ({ where }: { where: { userId: string; createdAt: { gte: Date; lt: Date } } }) => {
				return store.disputes.filter((row) =>
					row.userId === where.userId
					&& row.createdAt >= where.createdAt.gte
					&& row.createdAt < where.createdAt.lt
				).length;
			}),
			createMany: vi.fn(async ({ data }: { data: Array<Omit<(typeof store.disputes)[number], 'createdAt'>> }) => {
				let count = 0;
				for (const row of data) {
					const exists = store.disputes.some((item) =>
						item.userId === row.userId && item.clientAnswerId === row.clientAnswerId,
					);
					if (exists) continue;
					store.disputes.push({ ...row, createdAt: new Date() });
					count += 1;
				}
				return { count };
			}),
		},
	},
}));

import { resolveDisputedItems } from '@/services/chinese/cnDisputeService';

const now = new Date('2026-10-21T10:00:00');

function item(overrides: Partial<CnPracticeSubmitItem> = {}): CnPracticeSubmitItem {
	return {
		wordId: 'w1',
		questionType: 'fill_sentence_typed',
		correct: false,
		answer: '已',
		exampleId: 'ex-1',
		clientAnswerId: 'c1',
		disputed: true,
		...overrides,
	};
}

describe('resolveDisputedItems', () => {
	beforeEach(() => {
		store.disputes.length = 0;
		store.examples.length = 0;
		store.examples.push({ id: 'ex-1', wordId: 'w1', ownerUserId: null });
	});

	it('files a dispute when the sentence answer meets the rules', async () => {
		const accepted = await resolveDisputedItems('user-a', [item()], now);
		expect(accepted).toEqual(new Set(['c1']));
		expect(store.disputes).toHaveLength(1);
		expect(store.disputes[0]).toEqual(expect.objectContaining({
			exampleId: 'ex-1',
			answer: '已',
			userId: 'user-a',
		}));
	});

	it('ignores disputes after the daily cap of 10', async () => {
		for (let i = 0; i < 10; i++) {
			store.disputes.push({
				userId: 'user-a',
				clientAnswerId: `old-${i}`,
				exampleId: 'ex-1',
				wordId: 'w1',
				answer: '旧',
				createdAt: now,
			});
		}
		const accepted = await resolveDisputedItems('user-a', [item({ clientAnswerId: 'c-new' })], now);
		expect(accepted.size).toBe(0);
		expect(store.disputes).toHaveLength(10);
	});

	it('ignores a dispute on a meaning-channel question', async () => {
		const accepted = await resolveDisputedItems('user-a', [item({
			questionType: 'hanzi_to_meaning',
			answer: 'học sinh',
		})], now);
		expect(accepted.size).toBe(0);
		expect(store.disputes).toHaveLength(0);
	});

	it('does not file the same client answer twice', async () => {
		await resolveDisputedItems('user-a', [item()], now);
		const second = await resolveDisputedItems('user-a', [item()], now);
		expect(second).toEqual(new Set(['c1']));
		expect(store.disputes).toHaveLength(1);
	});
});
