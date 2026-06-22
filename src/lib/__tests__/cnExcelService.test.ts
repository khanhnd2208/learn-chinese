import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
	previewUserWorkbook,
	importUserWorkbook,
} from '@/services/chinese/cnExcelService';

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
			deleteMany: vi.fn(),
			create: vi.fn(),
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

function workbookFile(sheets: Record<string, Record<string, unknown>[]>): File {
	const wb = XLSX.utils.book_new();
	for (const [name, rows] of Object.entries(sheets)) {
		XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
	}
	const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
	return new File([buffer], 'test.xlsx', {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
}

function tuVungFile(rows: Record<string, unknown>[]): File {
	return workbookFile({ tu_vung: rows });
}

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
	it('accepts valid tu_vung workbook with rich counters', async () => {
		const file = tuVungFile([
			{
				bo_tu: 'Bài 1',
				simplified: '学生',
				pinyin: 'xuésheng',
				meaning_vi: 'học sinh',
				vi_du_1: '我是学生。',
				vi_du_2: '他也是学生。',
			},
			{
				bo_tu: 'Bài 1',
				simplified: '你好',
				pinyin: 'nǐ hǎo',
				meaning_vi: 'xin chào',
			},
		]);

		const preview = await previewUserWorkbook(file, 'user-1');
		expect(preview.errors).toHaveLength(0);
		expect(preview.validWords).toBe(2);
		expect(preview.setsCount).toBe(1);
		expect(preview.wordsWithExamples).toBe(1);
		expect(preview.wordsWithoutExamples).toBe(1);
		expect(preview.examplesAuto).toBe(2);
		expect(preview.matchedWords).toBe(2);
		expect(preview.pendingWords).toBe(0);
	});

	it('warns on bad example without blocking import', async () => {
		const file = tuVungFile([
			{
				bo_tu: 'Bài 1',
				simplified: '朋友',
				pinyin: 'péngyou',
				meaning_vi: 'bạn bè',
				vi_du_1: '他很好。',
			},
		]);

		const preview = await previewUserWorkbook(file);
		expect(preview.errors).toHaveLength(0);
		expect(preview.badExampleWarnings).toHaveLength(1);
		expect(preview.badExampleWarnings[0]).toMatchObject({
			simplified: '朋友',
			reason: 'missing_target',
			exampleIndex: 1,
		});
		expect(preview.warnings.some((w) => w.includes('朋友'))).toBe(true);
	});

	it('rejects missing required fields', async () => {
		const file = tuVungFile([
			{ bo_tu: 'Bài 1', simplified: '学生' },
		]);
		const preview = await previewUserWorkbook(file);
		expect(preview.errors.some((e) => e.includes('pinyin'))).toBe(true);
		expect(preview.errors.some((e) => e.includes('meaning_vi'))).toBe(true);
	});

	it('rejects duplicate simplified in file', async () => {
		const file = tuVungFile([
			{ bo_tu: 'Bài 1', simplified: '学生', pinyin: 'xuésheng', meaning_vi: 'học sinh' },
			{ bo_tu: 'Bài 2', simplified: '学生', pinyin: 'xuésheng', meaning_vi: 'học sinh' },
		]);
		const preview = await previewUserWorkbook(file);
		expect(preview.errors.some((e) => e.includes('trùng'))).toBe(true);
	});

	it('warns when bo_tu already exists for user', async () => {
		mockWordSetFindMany.mockResolvedValue([{ title: 'Bài 1' }] as never);
		const file = tuVungFile([
			{ bo_tu: 'Bài 1', simplified: '学生', pinyin: 'xuésheng', meaning_vi: 'học sinh' },
		]);
		const preview = await previewUserWorkbook(file, 'user-1');
		expect(preview.duplicateSetNames).toEqual(['Bài 1']);
		expect(preview.warnings.some((w) => w.includes('import N'))).toBe(true);
	});

	it('rejects unknown format', async () => {
		const file = workbookFile({ random: [{ foo: 'bar' }] });
		const preview = await previewUserWorkbook(file);
		expect(preview.errors.some((e) => e.includes('không đúng định dạng'))).toBe(true);
	});
});

describe('previewUserWorkbook — legacy format', () => {
	it('accepts valid sample-shaped workbook', async () => {
		const file = workbookFile({
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
		const file = workbookFile({
			set_items: [{ set_key: 'bai1', raw_term: '我' }],
		});
		const preview = await previewUserWorkbook(file);
		expect(preview.errors.some((e) => e.includes('không đúng định dạng'))).toBe(true);
	});

	it('rejects duplicate set_key', async () => {
		const file = workbookFile({
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
	it('upserts words and creates set with suffix on collision', async () => {
		const file = tuVungFile([
			{
				bo_tu: 'Bài 1',
				simplified: '学生',
				pinyin: 'xuésheng',
				meaning_vi: 'học sinh',
				usage_note_vi: 'Thường dùng cho học sinh phổ thông hoặc sinh viên.',
				vi_du_1: '我是学生。',
			},
		]);

		mockWordSetFindMany.mockResolvedValue([{ title: 'Bài 1' }] as never);

		const createdSets: Array<{ title: string }> = [];
		const upsertCalls: Array<{ create: Record<string, unknown>; update: Record<string, unknown> }> = [];
		mockTransaction.mockImplementation(async (callback) => {
			const tx = {
				cnWord: {
					upsert: vi.fn().mockImplementation((args) => {
						upsertCalls.push(args);
						return { id: 'word-1', simplified: '学生' };
					}),
				},
				cnExample: {
					deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
					create: vi.fn().mockResolvedValue({ id: 'ex-1' }),
				},
				cnWordSet: {
					create: vi.fn().mockImplementation(({ data }) => {
						createdSets.push({ title: data.title });
						return { id: 'set-1', ...data };
					}),
				},
				cnWordSetItem: {
					create: vi.fn().mockResolvedValue({ id: 'item-1' }),
				},
			};
			return callback(tx as never);
		});

		const result = await importUserWorkbook('user-1', file, false);
		expect(result.errors).toHaveLength(0);
		expect(createdSets[0]?.title).toBe('Bài 1 (import 2)');
		expect(upsertCalls[0]?.create.usageNoteVi).toBe('Thường dùng cho học sinh phổ thông hoặc sinh viên.');
		expect(upsertCalls[0]?.update.usageNoteVi).toBe('Thường dùng cho học sinh phổ thông hoặc sinh viên.');
	});
});
