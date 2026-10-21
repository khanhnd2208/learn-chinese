import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { syncCanonicalExamples } from '@/services/chinese/cnExampleSync';

interface StoredExample {
	id: string;
	wordId: string;
	hanzi: string;
	pinyin: string;
	meaningVi: string;
	meaningViTemplate: string;
	naturalnessStatus: string;
	targetWordStart: number | null;
	targetWordEnd: number | null;
	ownerUserId: string | null;
}

function createTx(rows: StoredExample[]) {
	const store = rows.map((row) => ({ ...row }));
	const findMany = vi.fn(async (args: { where: { wordId: string; ownerUserId: null } }) => {
		return store.filter((row) => row.wordId === args.where.wordId && row.ownerUserId == null);
	});
	const update = vi.fn(async (args: { where: { id: string }; data: Partial<StoredExample> }) => {
		const row = store.find((item) => item.id === args.where.id);
		if (!row) throw new Error('missing row');
		Object.assign(row, args.data);
		return row;
	});
	const create = vi.fn(async (args: { data: Omit<StoredExample, 'id'> }) => {
		const row = { id: `created-${store.length + 1}`, ...args.data };
		store.push(row);
		return row;
	});
	const deleteMany = vi.fn(async (args: { where: { id: { in: string[] }; ownerUserId: null } }) => {
		const ids = new Set(args.where.id.in);
		for (let i = store.length - 1; i >= 0; i--) {
			if (ids.has(store[i].id) && store[i].ownerUserId == null) store.splice(i, 1);
		}
		return { count: ids.size };
	});
	const tx = { cnExample: { findMany, update, create, deleteMany } } as unknown as Pick<Prisma.TransactionClient, 'cnExample'>;
	return { tx, store, findMany, update, create, deleteMany };
}

const canonical = {
	id: 'ex-1',
	wordId: 'w1',
	hanzi: '他是老师。',
	pinyin: 'tā shì __.',
	meaningVi: 'Anh ấy là giáo viên.',
	meaningViTemplate: '',
	naturalnessStatus: 'auto',
	targetWordStart: 2,
	targetWordEnd: 4,
	ownerUserId: null,
};

describe('syncCanonicalExamples', () => {
	it('updates a matching sentence and keeps its id', async () => {
		const { tx, store, update, create, deleteMany } = createTx([canonical]);
		await syncCanonicalExamples(tx, 'w1', [{
			hanzi: '他是老师。',
			pinyin: 'tā shì lǎoshī.',
			meaningVi: 'Anh ấy là thầy giáo.',
			meaningViTemplate: '',
			naturalnessStatus: 'auto',
			targetWordStart: 2,
			targetWordEnd: 4,
		}]);
		expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ex-1' } }));
		expect(create).not.toHaveBeenCalled();
		expect(deleteMany).not.toHaveBeenCalled();
		expect(store).toHaveLength(1);
		expect(store[0].id).toBe('ex-1');
		expect(store[0].meaningVi).toBe('Anh ấy là thầy giáo.');
	});

	it('matches hanzi after Unicode normalization', async () => {
		const { tx, store, create } = createTx([{
			...canonical,
			hanzi: '你\u0065\u0301。',
		}]);
		await syncCanonicalExamples(tx, 'w1', [{
			hanzi: '你é。',
			pinyin: 'nǐ é.',
			meaningVi: 'Bạn é.',
			naturalnessStatus: 'auto',
		}]);
		expect(create).not.toHaveBeenCalled();
		expect(store[0].id).toBe('ex-1');
		expect(store[0].pinyin).toBe('nǐ é.');
	});

	it('creates a sentence that is not in the database', async () => {
		const { tx, store, create } = createTx([canonical]);
		await syncCanonicalExamples(tx, 'w1', [
			{
				hanzi: '他是老师。',
				pinyin: canonical.pinyin,
				meaningVi: canonical.meaningVi,
				naturalnessStatus: 'auto',
			},
			{
				hanzi: '老师好。',
				pinyin: '__ hǎo.',
				meaningVi: 'Thầy giáo khỏe.',
				naturalnessStatus: 'auto',
				targetWordStart: 0,
				targetWordEnd: 2,
			},
		]);
		expect(create).toHaveBeenCalledOnce();
		expect(store.map((row) => row.hanzi)).toEqual(['他是老师。', '老师好。']);
		expect(store[0].id).toBe('ex-1');
	});

	it('deletes a canonical sentence missing from the file', async () => {
		const { tx, store, deleteMany } = createTx([
			canonical,
			{ ...canonical, id: 'ex-2', hanzi: '老师好。' },
		]);
		await syncCanonicalExamples(tx, 'w1', [{
			hanzi: '他是老师。',
			pinyin: canonical.pinyin,
			meaningVi: canonical.meaningVi,
			naturalnessStatus: 'auto',
		}]);
		expect(deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ['ex-2'] }, ownerUserId: null },
		});
		expect(store.map((row) => row.id)).toEqual(['ex-1']);
	});

	it('does not downgrade a verified example to auto', async () => {
		const { tx, store } = createTx([{ ...canonical, naturalnessStatus: 'verified' }]);
		await syncCanonicalExamples(tx, 'w1', [{
			hanzi: '他是老师。',
			pinyin: 'tā shì __.',
			meaningVi: 'Anh ấy là giáo viên.',
			naturalnessStatus: 'auto',
		}]);
		expect(store[0].naturalnessStatus).toBe('verified');
	});

	it('does not load or delete learner-owned examples', async () => {
		const learner = { ...canonical, id: 'user-ex', hanzi: '我的老师。', ownerUserId: 'user-1' };
		const { tx, store, findMany, deleteMany } = createTx([canonical, learner]);
		await syncCanonicalExamples(tx, 'w1', []);
		expect(findMany).toHaveBeenCalledWith({ where: { wordId: 'w1', ownerUserId: null } });
		expect(deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ['ex-1'] }, ownerUserId: null },
		});
		expect(store.map((row) => row.id)).toEqual(['user-ex']);
	});
});
