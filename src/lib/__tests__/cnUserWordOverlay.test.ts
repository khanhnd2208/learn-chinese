import { beforeEach, describe, expect, it, vi } from 'vitest';

const { store } = vi.hoisted(() => ({
	store: {
		words: [] as Array<Record<string, unknown>>,
		overrides: [] as Array<Record<string, unknown>>,
		examples: [] as Array<Record<string, unknown>>,
		setItems: [] as Array<{ wordId: string; userId: string }>,
		seq: 1,
	},
}));

vi.mock('@/lib/prisma', () => {
	const nextId = () => `id-${store.seq++}`;
	return {
		prisma: {
			cnWord: {
				findUnique: vi.fn(async ({ where }: { where: { id?: string; simplified?: string } }) =>
					store.words.find((word) =>
						(where.id && word.id === where.id) || (where.simplified && word.simplified === where.simplified),
					) ?? null),
				findMany: vi.fn(async ({ where }: { where?: { id?: { in: string[] }; status?: string } }) => {
					let rows = store.words;
					if (where?.id?.in) rows = rows.filter((word) => where.id!.in.includes(word.id as string));
					if (where?.status) rows = rows.filter((word) => word.status === where.status);
					return rows.map((word) => ({
						...word,
						examples: store.examples.filter((example) => example.wordId === word.id),
						patterns: [],
						chars: [],
					}));
				}),
				create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
					const word = { id: nextId(), ...data, createdAt: new Date(), updatedAt: new Date() };
					store.words.push(word);
					return word;
				}),
				update: vi.fn(),
			},
			cnUserWordOverride: {
				findMany: vi.fn(async ({ where }: { where: { userId: string; wordId: { in: string[] } } }) =>
					store.overrides.filter((row) =>
						row.userId === where.userId && where.wordId.in.includes(row.wordId as string),
					)),
				findUnique: vi.fn(async ({ where }: { where: { userId_wordId: { userId: string; wordId: string } } }) =>
					store.overrides.find((row) =>
						row.userId === where.userId_wordId.userId && row.wordId === where.userId_wordId.wordId,
					) ?? null),
				upsert: vi.fn(async ({
					where,
					create,
					update,
				}: {
					where: { userId_wordId: { userId: string; wordId: string } };
					create: Record<string, unknown>;
					update: Record<string, unknown>;
				}) => {
					const key = where.userId_wordId;
					const existing = store.overrides.find((row) => row.userId === key.userId && row.wordId === key.wordId);
					if (existing) {
						Object.assign(existing, update);
						return existing;
					}
					const created = { id: nextId(), ...create };
					store.overrides.push(created);
					return created;
				}),
			},
			cnExample: {
				findMany: vi.fn(async () => store.examples),
				deleteMany: vi.fn(async ({ where }: { where: { wordId: string; ownerUserId: string | null } }) => {
					const before = store.examples.length;
					store.examples = store.examples.filter((example) =>
						!(example.wordId === where.wordId && example.ownerUserId === where.ownerUserId),
					);
					return { count: before - store.examples.length };
				}),
				createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
					for (const row of data) store.examples.push({ id: nextId(), ...row });
					return { count: data.length };
				}),
			},
			cnWordSetItem: {
				findFirst: vi.fn(async ({ where }: { where: { wordId: string; set: { userId: string } } }) =>
					store.setItems.find((item) => item.wordId === where.wordId && item.userId === where.set.userId) ?? null),
			},
			cnWordChar: { findMany: vi.fn(async () => []) },
			cnWordProgress: { findMany: vi.fn(async () => []) },
		},
	};
});

import { prisma } from '@/lib/prisma';
import { getWordCard, updateWordFields } from '@/services/chinese/cnContentService';
import { loadWordViewsForUser, writeUserWordOverlay } from '@/services/chinese/cnWordViewService';

function seedCanonical() {
	store.words.push({
		id: 'word-student',
		simplified: '学生',
		pinyin: 'xuésheng',
		hanViet: 'học sinh',
		meaningVi: 'học sinh',
		partOfSpeech: 'n',
		ghiChu: '',
		mnemonicVi: '',
		usageNoteVi: '',
		hskLevel: 1,
		pinyinPlain: '',
		pinyinNumbered: '',
		pinyinSyllables: [],
		tones: [],
		frequencyRank: null,
		difficultyLevel: null,
		isFunctionWord: false,
		learningPriority: null,
		status: 'published',
		systemCheckedFields: [],
		expertVerifiedFields: [],
		verifiedAt: null,
		verifiedById: null,
		createdByUserId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	store.examples.push({
		id: 'ex-canonical',
		wordId: 'word-student',
		hanzi: '我是学生',
		pinyin: '',
		meaningVi: 'tôi là học sinh',
		meaningViTemplate: '',
		naturalnessStatus: 'auto',
		targetWordStart: 2,
		targetWordEnd: 4,
		ownerUserId: null,
	});
	store.examples.push({
		id: 'ex-b',
		wordId: 'word-student',
		hanzi: 'B',
		pinyin: '',
		meaningVi: 'của B',
		meaningViTemplate: '',
		naturalnessStatus: 'auto',
		targetWordStart: 0,
		targetWordEnd: 1,
		ownerUserId: 'user-b',
	});
	store.setItems.push({ wordId: 'word-student', userId: 'user-a' }, { wordId: 'word-student', userId: 'user-b' });
}

describe('learner word overlay', () => {
	beforeEach(() => {
		store.words = [];
		store.overrides = [];
		store.examples = [];
		store.setItems = [];
		store.seq = 1;
		seedCanonical();
		vi.mocked(prisma.cnWord.update).mockClear();
	});

	it('keeps a learner gloss off the shared word and off other learners', async () => {
		await writeUserWordOverlay(prisma, 'user-a', {
			simplified: '学生',
			meaningVi: 'X',
			examples: [{ hanzi: 'A', pinyin: '', meaningVi: 'của A' }],
		});

		expect(store.words[0]?.meaningVi).toBe('học sinh');
		expect((await loadWordViewsForUser('user-a', ['word-student'])).get('word-student')?.meaningVi).toBe('X');
		expect((await loadWordViewsForUser('user-b', ['word-student'])).get('word-student')?.meaningVi).toBe('học sinh');
		expect(store.examples.some((example) => example.id === 'ex-canonical')).toBe(true);
		expect(store.examples.some((example) => example.id === 'ex-b')).toBe(true);

		await writeUserWordOverlay(prisma, 'user-a', {
			simplified: '学生',
			meaningVi: 'X2',
			examples: [{ hanzi: 'A2', pinyin: '', meaningVi: 'của A lần 2' }],
		});
		expect(store.examples.filter((example) => example.ownerUserId === 'user-a')).toHaveLength(1);
		expect(store.examples.some((example) => example.id === 'ex-canonical')).toBe(true);
		expect(store.examples.some((example) => example.id === 'ex-b')).toBe(true);

		store.words[0]!.meaningVi = 'học trò';
		expect((await loadWordViewsForUser('user-a', ['word-student'])).get('word-student')?.meaningVi).toBe('X2');
		expect((await getWordCard('word-student', 'user-b'))?.meaningVi).toBe('học trò');
		expect((await getWordCard('word-student', 'user-a'))?.meaningVi).toBe('X2');
	});

	it('edits one learner without writing the shared word', async () => {
		const updated = await updateWordFields('user-a', 'word-student', { meaningVi: 'X' });
		expect(updated?.meaningVi).toBe('X');
		expect(prisma.cnWord.update).not.toHaveBeenCalled();
		expect(store.words[0]?.meaningVi).toBe('học sinh');
		expect((await getWordCard('word-student', 'user-b'))?.meaningVi).toBe('học sinh');
	});
});
