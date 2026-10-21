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
	acceptedAnswers: [] as string[],
	pending: [] as Array<{ exampleId: string; answer: string; status: string }>,
}));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnExample: {
			findMany: vi.fn(async ({ where }: { where: { id: { in: string[] }; OR: Array<{ ownerUserId: string | null }> } }) => {
				const owners = new Set(where.OR.map((clause) => clause.ownerUserId));
				return store.examples.filter((row) => where.id.in.includes(row.id) && owners.has(row.ownerUserId));
			}),
			findUnique: vi.fn(async () => ({ acceptedAnswers: store.acceptedAnswers })),
			update: vi.fn(async ({ data }: { data: { acceptedAnswers: string[] } }) => {
				store.acceptedAnswers = data.acceptedAnswers;
				return { id: 'ex-1' };
			}),
		},
		$transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
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
			updateMany: vi.fn(async ({ where, data }: { where: { exampleId: string; answer: string; status: string }; data: { status: string } }) => {
				let count = 0;
				for (const row of store.pending) {
					if (row.exampleId === where.exampleId && row.answer === where.answer && row.status === where.status) {
						row.status = data.status;
						count += 1;
					}
				}
				return { count };
			}),
		},
	},
}));

import { groupPendingDisputes, resolveDisputeGroup, resolveDisputedItems } from '@/services/chinese/cnDisputeService';

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

describe('dispute groups', () => {
	beforeEach(() => {
		store.acceptedAnswers = ['已'];
		store.pending = [
			{ exampleId: 'ex-1', answer: '也', status: 'pending' },
			{ exampleId: 'ex-1', answer: '也', status: 'pending' },
			{ exampleId: 'ex-1', answer: '还', status: 'pending' },
		];
	});

	it('counts distinct learners and keeps the latest report', () => {
		const groups = groupPendingDisputes([
			{
				exampleId: 'ex-1',
				answer: '也',
				userId: 'u1',
				createdAt: new Date('2026-10-21T01:00:00Z'),
				example: { hanzi: '他们也都来了。', meaningVi: 'Họ也都 đến.', word: { simplified: '都', meaningVi: 'đều' } },
			},
			{
				exampleId: 'ex-1',
				answer: '也',
				userId: 'u1',
				createdAt: new Date('2026-10-21T03:00:00Z'),
				example: { hanzi: '他们也都来了。', meaningVi: 'Họ也都 đến.', word: { simplified: '都', meaningVi: 'đều' } },
			},
			{
				exampleId: 'ex-1',
				answer: '也',
				userId: 'u2',
				createdAt: new Date('2026-10-21T02:00:00Z'),
				example: { hanzi: '他们也都来了。', meaningVi: 'Họ也都 đến.', word: { simplified: '都', meaningVi: 'đều' } },
			},
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.userCount).toBe(2);
		expect(groups[0]?.latestAt).toBe(new Date('2026-10-21T03:00:00Z').toISOString());
	});

	it('adds an accepted answer once and resolves every pending report in the group', async () => {
		const first = await resolveDisputeGroup('admin-1', 'ex-1', '也', 'accept', now);
		expect(first.acceptedAnswers).toEqual(['已', '也']);
		expect(first.updated).toBe(2);
		expect(store.pending.filter((row) => row.answer === '也').every((row) => row.status === 'accepted')).toBe(true);
		expect(store.pending.find((row) => row.answer === '还')?.status).toBe('pending');

		const again = await resolveDisputeGroup('admin-1', 'ex-1', '也', 'accept', now);
		expect(again.acceptedAnswers).toEqual(['已', '也']);
	});
});
