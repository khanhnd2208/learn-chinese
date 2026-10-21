import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitEnglishAnswer } from '@/services/english/enAnswerService';

const harness = vi.hoisted(() => {
	const logs: Array<Record<string, unknown>> = [];
	const upserts: Array<{ intervalIdx?: number; usageExampleIds?: string[] }> = [];
	const cnCreate = vi.fn();
	const tx = {
		enAnswerLog: {
			findUnique: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
			findMany: vi.fn(async () => logs),
			create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
				logs.push({ ...data, createdAt: new Date(Date.now() + logs.length) });
				return data;
			}),
		},
		enQuestion: {
			findFirst: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
			findUnique: vi.fn(async (): Promise<Record<string, unknown> | null> => ({ answer: 'borrow' })),
		},
		enAudioOpen: {
			findUnique: vi.fn(async (): Promise<{ id: string } | null> => null),
		},
		enSenseSkill: {
			findUnique: vi.fn(async () => null),
			upsert: vi.fn(async ({ create }: { create: { intervalIdx: number; usageExampleIds: string[] } }) => {
				upserts.push(create);
				return create;
			}),
		},
		enPatternProgress: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
		},
	};
	return { logs, upserts, cnCreate, tx };
});

vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: (fn: (db: typeof harness.tx) => Promise<unknown>) => fn(harness.tx),
		enQuestion: {
			findUnique: vi.fn(async () => ({ id: 'q1', status: 'published' })),
			update: vi.fn(),
		},
		enAnswerLog: { findMany: vi.fn(async () => []) },
		enDispute: { findMany: vi.fn(async () => []) },
		cnAnswerLog: { create: (...args: unknown[]) => harness.cnCreate(...args) },
	},
}));

const question = {
	id: 'q1',
	status: 'published',
	skill: 'usage',
	answer: 'borrow',
	acceptedAnswers: ['use'],
	senseId: 's1',
	patternId: null,
	exampleId: 'ex-1',
	patternExampleId: null,
};

describe('submitEnglishAnswer', () => {
	beforeEach(() => {
		harness.logs.length = 0;
		harness.upserts.length = 0;
		vi.clearAllMocks();
		harness.tx.enQuestion.findFirst.mockResolvedValue(question);
		harness.tx.enAnswerLog.findUnique.mockResolvedValue(null);
		harness.tx.enAudioOpen.findUnique.mockResolvedValue(null);
	});

	it('grades from the stored question and ignores a repeated clientAnswerId', async () => {
		const first = await submitEnglishAnswer('user-a', {
			questionId: 'q1',
			clientAnswerId: 'same',
			answer: 'nope',
		});
		expect(first.result).toBe('wrong');
		expect(first.duplicate).toBe(false);

		harness.tx.enAnswerLog.findUnique.mockResolvedValue({
			skill: 'usage',
			senseId: 's1',
			patternId: null,
			questionId: 'q1',
			result: 'wrong',
			audioOpened: false,
		});
		const second = await submitEnglishAnswer('user-a', {
			questionId: 'q1',
			clientAnswerId: 'same',
			answer: 'borrow',
		});
		expect(second.duplicate).toBe(true);
		expect(harness.logs).toHaveLength(1);
		expect(harness.cnCreate).not.toHaveBeenCalled();
	});

	it('does not promote usage after the full sentence was opened', async () => {
		harness.tx.enAudioOpen.findUnique.mockResolvedValue({ id: 'open' });
		const heard = await submitEnglishAnswer('user-a', {
			questionId: 'q1',
			clientAnswerId: 'heard',
			answer: 'borrow',
		});
		expect(heard.displayCorrect).toBe(true);
		expect(heard.promoted).toBe(false);
		expect(harness.upserts.at(-1)?.intervalIdx).toBe(0);
		expect(harness.upserts.at(-1)?.usageExampleIds).toEqual([]);
	});

	it('does not lower the step for an accepted alternate', async () => {
		await submitEnglishAnswer('user-a', {
			questionId: 'q1',
			clientAnswerId: 'first',
			answer: 'borrow',
		});
		const alternate = await submitEnglishAnswer('user-a', {
			questionId: 'q1',
			clientAnswerId: 'second',
			answer: 'use',
		});
		expect(alternate.result).toBe('alternate_plausible');
		expect(alternate.promoted).toBe(false);
		expect(harness.upserts.at(-1)?.intervalIdx).toBe(1);
	});
});
