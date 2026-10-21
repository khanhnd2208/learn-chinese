import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CnWordProgress } from '@prisma/client';

const store = vi.hoisted(() => ({
	logs: [] as Array<{
		id: string;
		userId: string;
		wordId: string;
		exampleId: string | null;
		createdAt: Date;
		correct: boolean;
		disputed: boolean;
		source: string;
		questionType: string;
		channelIdxBefore: number | null;
		answer: string | null;
	}>,
	progress: null as CnWordProgress | null,
	progressUpdates: [] as Array<Record<string, unknown>>,
	disputedLogIds: [] as string[],
}));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnAnswerLog: {
			findMany: vi.fn(async () => store.logs),
			update: vi.fn(async ({ where }: { where: { id: string } }) => {
				store.disputedLogIds.push(where.id);
				return { id: where.id };
			}),
		},
		cnWordProgress: {
			findUnique: vi.fn(async () => store.progress),
			update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
				store.progressUpdates.push(data);
				return data;
			}),
		},
		$transaction: vi.fn(async (run: (tx: unknown) => Promise<number>) => {
			const { prisma } = await import('@/lib/prisma');
			return run(prisma);
		}),
	},
}));

import { restoreSentenceLevels, selectLogsToRestore, type SentenceRestoreLog } from '@/services/chinese/cnExampleQualityService';

const now = new Date('2026-10-21T10:00:00Z');

function log(overrides: Partial<SentenceRestoreLog> = {}): SentenceRestoreLog {
	return {
		id: 'log-1',
		userId: 'u1',
		wordId: 'w1',
		exampleId: 'ex-1',
		createdAt: new Date('2026-10-20T10:00:00Z'),
		correct: false,
		disputed: false,
		source: 'review',
		questionType: 'fill_sentence_typed',
		channelIdxBefore: 3,
		answer: '已',
		...overrides,
	};
}

function progress(sentenceIntervalIdx: number): CnWordProgress {
	return {
		id: 'p1',
		userId: 'u1',
		wordId: 'w1',
		state: 'familiar',
		dueAt: new Date('2026-11-01T10:00:00Z'),
		intervalIdx: 2,
		lastReviewedAt: now,
		meaningCorrect: 4,
		meaningTotal: 4,
		soundCorrect: 4,
		soundTotal: 4,
		sentenceCorrect: 2,
		sentenceTotal: 4,
		meaningDueAt: new Date('2026-11-01T10:00:00Z'),
		meaningIntervalIdx: 3,
		soundDueAt: new Date('2026-11-01T10:00:00Z'),
		soundIntervalIdx: 3,
		sentenceDueAt: new Date('2026-11-01T10:00:00Z'),
		sentenceIntervalIdx,
		sentenceUnlockedAt: null,
		lastExampleId: 'ex-1',
		meaningHeavyLapses: 0,
		soundHeavyLapses: 0,
		sentenceHeavyLapses: 1,
		isStickingPoint: false,
		meaningMarkedKnownAt: null,
		soundMarkedKnownAt: null,
		sentenceMarkedKnownAt: null,
		sentenceIntroDayKey: null,
		sentenceIntroDayCount: 0,
		introducedAt: null,
		createdAt: now,
		updatedAt: now,
	};
}

beforeEach(() => {
	store.logs = [];
	store.progress = null;
	store.progressUpdates = [];
	store.disputedLogIds = [];
});

describe('selectLogsToRestore', () => {
	it('skips a learner who already answered another sentence for the word', () => {
		const chosen = selectLogsToRestore([
			log(),
			log({ id: 'later', createdAt: new Date('2026-10-21T09:00:00Z'), exampleId: 'ex-2', correct: true, channelIdxBefore: 2 }),
		], 'ex-1');
		expect(chosen).toEqual([]);
	});

	it('does not restore the same miss twice', () => {
		expect(selectLogsToRestore([log({ disputed: true })], 'ex-1')).toEqual([]);
	});

	it('ignores logs written before the sentence interval was recorded', () => {
		expect(selectLogsToRestore([log({ channelIdxBefore: null })], 'ex-1')).toEqual([]);
	});

	it('restores only the answer an admin just accepted', () => {
		const chosen = selectLogsToRestore([
			log({ id: 'match', answer: '已' }),
			log({ id: 'other', userId: 'u2', answer: '也' }),
		], 'ex-1', ['已']);
		expect(chosen.map((row) => row.id)).toEqual(['match']);
	});
});

describe('restoreSentenceLevels', () => {
	it('puts the sentence interval back and marks the log so it is not repaired again', async () => {
		store.logs = [log()];
		store.progress = progress(2);
		const restored = await restoreSentenceLevels({ exampleId: 'ex-1', wordId: 'w1', now });
		expect(restored).toBe(1);
		expect(store.progressUpdates[0]).toMatchObject({
			sentenceIntervalIdx: 3,
			sentenceHeavyLapses: 0,
			intervalIdx: 3,
		});
		const due = store.progressUpdates[0]?.sentenceDueAt as Date;
		expect(due.getTime()).toBeLessThan(new Date('2026-11-01T10:00:00Z').getTime());
		expect(due.getTime()).toBeGreaterThan(now.getTime());
		expect(store.disputedLogIds).toEqual(['log-1']);
	});
});
