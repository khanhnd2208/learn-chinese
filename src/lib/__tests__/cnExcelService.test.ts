import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
	previewUserWorkbook,
	importUserWorkbook,
} from '@/services/chinese/cnExcelService';
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
		const file = tuVungFile([
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

		const preview = await previewUserWorkbook(file, 'user-1');
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
		const file = tuVungFile([
			withFiveExamples({
				bo_tu: 'Bài 1',
				simplified: '朋友',
				pinyin: 'péngyou',
				meaning_vi: 'bạn bè',
				mnemonic_vi: 'Mẹo nhớ',
				usage_note_vi: 'Cách dùng',
			}),
		]);

		const preview = await previewUserWorkbook(file);
		expect(preview.errors).toHaveLength(0);
		expect(preview.validWords).toBe(1);
	});

	it('rejects when fewer than 5 valid examples', async () => {
		const file = tuVungFile([
			{
				bo_tu: 'Bài 1',
				simplified: '学生',
				pinyin: 'xuésheng',
				meaning_vi: 'học sinh',
				vi_du_1: '我喜欢__。|wǒ xǐhuān __.|Tôi thích __.',
			},
		]);
		const preview = await previewUserWorkbook(file);
		expect(preview.errors.some((e) => e.includes('5 ví dụ'))).toBe(true);
		expect(preview.errors.some((e) => e.includes('chi tiết bên dưới'))).toBe(true);
	});

	it('surfaces badExampleWarnings with per-cell reasons', async () => {
		const file = tuVungFile([
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
		const preview = await previewUserWorkbook(file);
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

		const preview = await previewUserWorkbook(tuVungFile([repairedRow]));
		expect(preview.errors).toHaveLength(0);
		expect(preview.warnings.some((w) => w.includes('tự thêm dấu trống'))).toBe(true);
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
			withFiveExamples({
				bo_tu: 'Bài 1',
				simplified: '学生',
				pinyin: 'xuésheng',
				meaning_vi: 'học sinh',
				ghi_chu: 'Thường dùng cho học sinh phổ thông hoặc sinh viên.',
			}),
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
					createMany: vi.fn().mockResolvedValue({ count: 5 }),
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
		expect(upsertCalls[0]?.create.ghiChu).toBe('Thường dùng cho học sinh phổ thông hoặc sinh viên.');
		expect(upsertCalls[0]?.update.ghiChu).toBe('Thường dùng cho học sinh phổ thông hoặc sinh viên.');
	});
});
