import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	previewUserWorkbook,
	importUserWorkbook,
} from '@/services/chinese/cnExcelService';
import { buildExcelWorkbookBuffer } from '@/lib/excelWorkbook';
import { VI_DU_COLUMN_KEYS } from '@/lib/chinese/parseFillExample';
import { buildFiveFillExampleCells } from '@/lib/chinese/sampleFillExamples';

vi.mock('@/lib/prisma', () => ({
	prisma: {
		cnWord: {
			findMany: vi.fn(),
			upsert: vi.fn(),
		},
		cnWordSet: {
			findMany: vi.fn(),
			create: vi.fn(),
		},
		cnExample: {
			findMany: vi.fn(),
			update: vi.fn(),
			deleteMany: vi.fn(),
			create: vi.fn(),
			createMany: vi.fn(),
		},
		cnWordSetItem: {
			create: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}));

import { prisma } from '@/lib/prisma';

const mockWordFindMany = vi.mocked(prisma.cnWord.findMany);
const mockWordSetFindMany = vi.mocked(prisma.cnWordSet.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);

async function workbookFile(sheets: Record<string, Record<string, unknown>[]>): Promise<File> {
	const buffer = await buildExcelWorkbookBuffer(
		Object.entries(sheets).map(([name, rows]) => ({ name, rows })),
	);
	return new File([new Uint8Array(buffer)], 'test.xlsx', {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
}

function tuVungFile(rows: Record<string, unknown>[]): Promise<File> {
	return workbookFile({ tu_vung: rows });
}

function withFiveExamples(row: Record<string, unknown>): Record<string, unknown> {
	const simplified = String(row.simplified ?? '');
	const examples = buildFiveFillExampleCells({
		simplified,
		pinyin: String(row.pinyin ?? ''),
		meaningVi: String(row.meaning_vi ?? ''),
		hanViet: String(row.han_viet ?? ''),
		partOfSpeech: String(row.part_of_speech ?? ''),
		ghiChu: String(row.ghi_chu ?? ''),
	});
	const out = { ...row };
	for (let i = 0; i < VI_DU_COLUMN_KEYS.length; i++) {
		out[VI_DU_COLUMN_KEYS[i]] = examples[i];
	}
	return out;
}

const ADMIN = { canCreateWords: true };
const LEARNER = { canCreateWords: false };

beforeEach(() => {
	mockWordFindMany.mockReset();
	mockWordSetFindMany.mockReset();
	mockTransaction.mockReset();
	mockWordFindMany.mockResolvedValue([
		{ simplified: '我' },
		{ simplified: '你' },
	] as never);
	mockWordSetFindMany.mockResolvedValue([]);
});

describe('previewUserWorkbook — tu_vung format', () => {
	it('accepts valid tu_vung workbook with 12-column format', async () => {
		const file = await tuVungFile([
			withFiveExamples({
				bo_tu: 'Bài 1',
				simplified: '学生',
				pinyin: 'xuésheng',
				meaning_vi: 'học sinh',
				ghi_chu: '学 là học, 生 là người.',
			}),
			withFiveExamples({
				bo_tu: 'Bài 1',
				simplified: '你好',
				pinyin: 'nǐ hǎo',
				meaning_vi: 'xin chào',
			}),
		]);

		const preview = await previewUserWorkbook(file, 'user-1', ADMIN);
		expect(preview.errors).toHaveLength(0);
		expect(preview.validWords).toBe(2);
		expect(preview.setsCount).toBe(1);
		expect(preview.wordsWithExamples).toBe(2);
		expect(preview.wordsWithoutExamples).toBe(0);
		expect(preview.examplesAuto).toBe(10);
		expect(preview.matchedWords).toBe(2);
		expect(preview.pendingWords).toBe(0);
	});

	it('merges legacy mnemonic/usage into ghi_chu', async () => {
		const file = await tuVungFile([
			withFiveExamples({
				bo_tu: 'Bài 1',
				simplified: '朋友',
				pinyin: 'péngyou',
				meaning_vi: 'bạn bè',
				mnemonic_vi: 'Mẹo nhớ',
				usage_note_vi: 'Cách dùng',
			}),
		]);

		const preview = await previewUserWorkbook(file, undefined, ADMIN);
		expect(preview.errors).toHaveLength(0);
		expect(preview.validWords).toBe(1);
	});

	it('rejects when fewer than 5 valid examples', async () => {
		const file = await tuVungFile([
			{
				bo_tu: 'Bài 1',
				simplified: '学生',
				pinyin: 'xuésheng',
				meaning_vi: 'học sinh',
				vi_du_1: '我喜欢__。|wǒ xǐhuān __.|Tôi thích __.',
			},
		]);
		const preview = await previewUserWorkbook(file, undefined, ADMIN);
		expect(preview.errors.some((e) => e.includes('5 ví dụ'))).toBe(true);
		expect(preview.errors.some((e) => e.includes('chi tiết bên dưới'))).toBe(true);
	});

	it('surfaces badExampleWarnings with per-cell reasons', async () => {
		const file = await tuVungFile([
			{
				bo_tu: 'Bài 1',
				simplified: '老师',
				pinyin: 'lǎoshī',
				meaning_vi: 'giáo viên',
				vi_du_1: '他是。|tā shì.|Anh ấy là __.',
				vi_du_2: '他是。|tā shì.|Anh ấy là __.',
				vi_du_3: '他是。|tā shì.|Anh ấy là __.',
				vi_du_4: '他是。|tā shì.|Anh ấy là __.',
				vi_du_5: '他是。|tā shì.|Anh ấy là __.',
			},
		]);
		const preview = await previewUserWorkbook(file, undefined, ADMIN);
		expect(preview.badExampleWarnings?.length).toBe(5);
		expect(preview.badExampleWarnings?.[0]?.reason).toContain('Markdown');
		expect(preview.badExampleWarnings?.[0]?.simplified).toBe('老师');
	});

	it('warns when examples were auto-repaired', async () => {
		const examples = buildFiveFillExampleCells({
			simplified: '好',
			pinyin: 'hǎo',
			meaningVi: 'tốt',
			hanViet: 'hảo',
			partOfSpeech: 'tính từ',
			ghiChu: '',
		});
		const repairedRow: Record<string, unknown> = {
			bo_tu: 'Bài 1',
			simplified: '好',
			pinyin: 'hǎo',
			meaning_vi: 'tốt',
		};
		for (let i = 0; i < VI_DU_COLUMN_KEYS.length; i++) {
			repairedRow[VI_DU_COLUMN_KEYS[i]] = examples[i];
		}
		// Replace vi_du_1 with unblanked sentence that still contains target word
		repairedRow.vi_du_1 = '我很好。|wǒ hěn hǎo.|Tôi rất __.';

		const preview = await previewUserWorkbook(await tuVungFile([repairedRow]), undefined, ADMIN);
		expect(preview.errors).toHaveLength(0);
		expect(preview.warnings.some((w) => w.includes('tự thêm dấu trống'))).toBe(true);
	});

	it('rejects missing required fields', async () => {
		const file = await tuVungFile([
			{ bo_tu: 'Bài 1', simplified: '学生' },
		]);
		const preview = await previewUserWorkbook(file, undefined, ADMIN);
		expect(preview.errors.some((e) => e.includes('pinyin'))).toBe(true);
		expect(preview.errors.some((e) => e.includes('meaning_vi'))).toBe(true);
	});

	it('rejects duplicate simplified in file', async () => {
		const file = await tuVungFile([
			{ bo_tu: 'Bài 1', simplified: '学生', pinyin: 'xuésheng', meaning_vi: 'học sinh' },
			{ bo_tu: 'Bài 2', simplified: '学生', pinyin: 'xuésheng', meaning_vi: 'học sinh' },
		]);
		const preview = await previewUserWorkbook(file, undefined, ADMIN);
		expect(preview.errors.some((e) => e.includes('trùng'))).toBe(true);
	});

	it('warns when bo_tu already exists for user', async () => {
		mockWordSetFindMany.mockResolvedValue([{ title: 'Bài 1' }] as never);
		const file = await tuVungFile([
			{ bo_tu: 'Bài 1', simplified: '学生', pinyin: 'xuésheng', meaning_vi: 'học sinh' },
		]);
		const preview = await previewUserWorkbook(file, 'user-1', ADMIN);
		expect(preview.duplicateSetNames).toEqual(['Bài 1']);
		expect(preview.warnings.some((w) => w.includes('import N'))).toBe(true);
	});

	it('rejects unknown format', async () => {
		const file = await workbookFile({ random: [{ foo: 'bar' }] });
		const preview = await previewUserWorkbook(file, undefined, ADMIN);
		expect(preview.errors.some((e) => e.includes('không đúng định dạng'))).toBe(true);
	});
});

describe('previewUserWorkbook — legacy format', () => {
	it('accepts valid sample-shaped workbook', async () => {
		const file = await workbookFile({
			sets: [{ set_key: 'bai1', title: 'Bài 1', description: '', source: 'manual' }],
			set_items: [
				{ set_key: 'bai1', raw_term: '我', word_simplified: '我' },
				{ set_key: 'bai1', raw_term: '你', word_simplified: '你' },
				{ set_key: 'bai1', raw_term: '未知词', word_simplified: '未知词' },
			],
		});

		const preview = await previewUserWorkbook(file);
		expect(preview.errors).toHaveLength(0);
		expect(preview.sets).toBe(1);
		expect(preview.items).toBe(3);
		expect(preview.matchedWords).toBe(2);
		expect(preview.pendingWords).toBe(1);
		expect(preview.warnings.some((w) => w.includes('chưa có trong thư viện'))).toBe(true);
	});

	it('rejects missing sets sheet', async () => {
		const file = await workbookFile({
			set_items: [{ set_key: 'bai1', raw_term: '我' }],
		});
		const preview = await previewUserWorkbook(file);
		expect(preview.errors.some((e) => e.includes('không đúng định dạng'))).toBe(true);
	});

	it('rejects duplicate set_key', async () => {
		const file = await workbookFile({
			sets: [
				{ set_key: 'dup', title: 'A', description: '', source: 'manual' },
				{ set_key: 'dup', title: 'B', description: '', source: 'manual' },
			],
			set_items: [{ set_key: 'dup', raw_term: '我' }],
		});
		const preview = await previewUserWorkbook(file);
		expect(preview.errors.some((e) => e.includes('trùng'))).toBe(true);
	});
});

describe('importUserWorkbook — tu_vung format', () => {
	function txWithKnownWords(known: Array<{ id: string; simplified: string }>) {
		const created = {
			sets: [] as Array<{ title: string }>,
			items: [] as Array<{ rawTerm: string; wordId: string }>,
			wordUpserts: [] as Array<Record<string, unknown>>,
			exampleReads: [] as Array<Record<string, unknown>>,
			exampleDeletes: [] as Array<Record<string, unknown>>,
			exampleCreates: [] as Array<unknown>,
		};
		mockTransaction.mockImplementation(async (callback) => {
			const tx = {
				cnWord: {
					findMany: vi.fn().mockResolvedValue(known),
					upsert: vi.fn().mockImplementation((args) => {
						created.wordUpserts.push(args);
						return { id: 'word-admin', simplified: args.where.simplified };
					}),
					create: vi.fn(),
					update: vi.fn(),
				},
				cnUserWordOverride: { upsert: vi.fn() },
				cnExample: {
					findMany: vi.fn().mockImplementation((args) => {
						created.exampleReads.push(args.where);
						return [];
					}),
					update: vi.fn(),
					deleteMany: vi.fn().mockImplementation((args) => {
						created.exampleDeletes.push(args.where);
						return { count: 0 };
					}),
					create: vi.fn().mockImplementation((args) => {
						created.exampleCreates.push(args);
						return { id: 'ex-new', ...args.data };
					}),
					createMany: vi.fn(),
				},
				cnWordSet: {
					create: vi.fn().mockImplementation(({ data }) => {
						created.sets.push({ title: data.title });
						return { id: `set-${created.sets.length}`, ...data };
					}),
				},
				cnWordSetItem: {
					create: vi.fn().mockImplementation(({ data }) => {
						created.items.push({ rawTerm: data.rawTerm, wordId: data.wordId });
						return { id: 'item-1' };
					}),
				},
			};
			return callback(tx as never);
		});
		return created;
	}

	const fullRow = (simplified: string) => withFiveExamples({
		bo_tu: 'Bài 1',
		simplified,
		pinyin: 'xuésheng',
		meaning_vi: 'học sinh',
		ghi_chu: 'Ghi chú của người nhập.',
	});

	it('lets an admin create or update the shared word and its shared examples', async () => {
		const file = await tuVungFile([fullRow('学生')]);
		mockWordSetFindMany.mockResolvedValue([{ title: 'Bài 1' }] as never);
		const created = txWithKnownWords([]);

		const result = await importUserWorkbook('admin-1', file, false, ADMIN);

		expect(result.errors).toHaveLength(0);
		expect(created.sets[0]?.title).toBe('Bài 1 (import 2)');
		expect(created.wordUpserts).toHaveLength(1);
		expect(created.exampleReads[0]).toEqual({ wordId: 'word-admin', ownerUserId: null });
		expect(created.exampleCreates).toHaveLength(5);
		expect(created.exampleCreates[0]).toEqual(expect.objectContaining({
			data: expect.objectContaining({ wordId: 'word-admin', ownerUserId: null }),
		}));
		expect(created.items[0]).toEqual({ rawTerm: '学生', wordId: 'word-admin' });
	});

	it('links a learner only to words that already exist and never writes a word or example', async () => {
		const file = await tuVungFile([{ bo_tu: 'Bài 1', simplified: '学生' }]);
		mockWordFindMany.mockResolvedValue([{ id: 'word-1', simplified: '学生' }] as never);
		const created = txWithKnownWords([{ id: 'word-1', simplified: '学生' }]);

		const result = await importUserWorkbook('learner-1', file, false, LEARNER);

		expect(result.errors).toHaveLength(0);
		expect(created.wordUpserts).toHaveLength(0);
		expect(created.exampleDeletes).toHaveLength(0);
		expect(created.exampleCreates).toHaveLength(0);
		expect(created.items).toEqual([{ rawTerm: '学生', wordId: 'word-1' }]);
	});

	it('skips a learner word that is not in the system and says so', async () => {
		const file = await tuVungFile([
			{ bo_tu: 'Bài 1', simplified: '学生' },
			{ bo_tu: 'Bài 1', simplified: '新词' },
		]);
		mockWordFindMany.mockResolvedValue([{ id: 'word-1', simplified: '学生' }] as never);
		const created = txWithKnownWords([{ id: 'word-1', simplified: '学生' }]);

		const preview = await previewUserWorkbook(file, 'learner-1', LEARNER);
		expect(preview.errors).toHaveLength(0);
		expect(preview.items).toBe(1);
		expect(preview.pendingWords).toBe(1);
		expect(preview.warnings.some((w) => w.includes('新词') && w.includes('admin'))).toBe(true);

		await importUserWorkbook('learner-1', file, false, LEARNER);
		expect(created.items).toEqual([{ rawTerm: '学生', wordId: 'word-1' }]);
		expect(created.wordUpserts).toHaveLength(0);
	});

	it('rejects a learner file when none of its words exist yet', async () => {
		const file = await tuVungFile([{ bo_tu: 'Bài 1', simplified: '新词' }]);
		mockWordFindMany.mockResolvedValue([] as never);
		const created = txWithKnownWords([]);

		const result = await importUserWorkbook('learner-1', file, false, LEARNER);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(created.sets).toHaveLength(0);
		expect(created.wordUpserts).toHaveLength(0);
	});

	it('defaults to learner rules when no policy is given', async () => {
		const file = await tuVungFile([fullRow('新词')]);
		mockWordFindMany.mockResolvedValue([] as never);
		const created = txWithKnownWords([]);

		const result = await importUserWorkbook('someone', file, false);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(created.wordUpserts).toHaveLength(0);
	});
});
