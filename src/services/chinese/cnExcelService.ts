import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { MAX_CN_TERMS_PER_SET, MAX_IMPORT_ROWS } from '@/config/constants';
import { normalizeTerm } from '@/lib/chinese/hanziUtils';
import { enrollWordsInSrs } from '@/services/chinese/cnSrsEnrollmentService';
import { CORE_QUESTION_TYPE_SET } from '@/lib/chinese/coreQuestionTypes';
import type { CnErrorType, CnQuestionType, CnWordProgressState } from '@/types/chinese';

type Row = Record<string, unknown>;

const VALID_SET_SOURCES = new Set(['manual', 'hsk', 'textbook']);
const VALID_PROGRESS_STATES = new Set<CnWordProgressState>([
	'new', 'learning', 'weak', 'familiar', 'strong', 'mastered',
]);
const VALID_QUESTION_TYPES = CORE_QUESTION_TYPE_SET;
const VALID_ERROR_TYPES = new Set<CnErrorType>([
	'sai_nghia', 'sai_pinyin', 'sai_thanh_dieu', 'nghe_khong_ra',
	'nham_chu', 'quen_hanzi', 'sai_mau_cau', 'sai_vi_tri', 'qua_han',
]);

function asString(value: unknown): string {
	if (value === null || value === undefined) return '';
	return String(value).trim();
}

function getField(row: Row, ...keys: string[]): string {
	for (const key of keys) {
		const value = asString(row[key]);
		if (value) return value;
	}
	return '';
}

function asInt(value: unknown, fallback = 0): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asDate(value: unknown): Date | null {
	if (!value) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
	if (typeof value === 'number') {
		const parsed = XLSX.SSF.parse_date_code(value);
		if (!parsed) return null;
		return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S)));
	}
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
}

function rowsFromSheet(workbook: XLSX.WorkBook, sheetName: string): Row[] {
	const sheet = workbook.Sheets[sheetName];
	if (!sheet) return [];
	return XLSX.utils.sheet_to_json<Row>(sheet, { defval: '', raw: false });
}

function workbookBuffer(workbook: XLSX.WorkBook): Buffer {
	return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function sanitizeSheetRows(rows: Row[], maxRows = MAX_IMPORT_ROWS): Row[] {
	const nonEmpty = rows.filter((row) => Object.values(row).some((v) => asString(v)));
	if (nonEmpty.length > maxRows) {
		throw new AppError(`File có quá nhiều dòng (tối đa ${maxRows})`, 400);
	}
	return nonEmpty;
}

function isTuVungFormat(workbook: XLSX.WorkBook): boolean {
	return workbook.SheetNames.includes('tu_vung');
}

export interface BadExampleWarning {
	rowNumber: number;
	simplified: string;
	exampleIndex: 1 | 2 | 3;
	sentence: string;
	reason: string;
}

interface ParsedTuVungRow {
	rowNumber: number;
	boTu: string;
	simplified: string;
	pinyin: string;
	meaningVi: string;
	hanViet: string;
	partOfSpeech: string;
	ghiChu: string;
}

function parseTuVungRows(rows: Row[]): ParsedTuVungRow[] {
	return rows.map((row, index) => {
		const ghiChu = getField(row, 'ghi_chu', 'ghiChu');
		const legacyMnemonic = getField(row, 'mnemonic_vi', 'mnemonicVi');
		const legacyUsage = getField(row, 'usage_note_vi', 'usageNoteVi');
		const mergedGhiChu = ghiChu
			|| [legacyMnemonic, legacyUsage].filter(Boolean).join(' ').trim();

		return {
			rowNumber: index + 2,
			boTu: getField(row, 'bo_tu', 'boTu'),
			simplified: getField(row, 'simplified'),
			pinyin: getField(row, 'pinyin'),
			meaningVi: getField(row, 'meaning_vi', 'meaningVi'),
			hanViet: getField(row, 'han_viet', 'hanViet'),
			partOfSpeech: getField(row, 'part_of_speech', 'partOfSpeech'),
			ghiChu: mergedGhiChu,
		};
	});
}

function emptyTuVungPreviewFields(): Pick<
	UserWorkbookPreview,
	| 'totalRows'
	| 'validWords'
	| 'setsCount'
	| 'examplesTotal'
	| 'examplesAuto'
	| 'examplesDraft'
	| 'wordsWithExamples'
	| 'wordsWithoutExamples'
	| 'badExampleWarnings'
	| 'duplicateSetNames'
> {
	return {
		totalRows: 0,
		validWords: 0,
		setsCount: 0,
		examplesTotal: 0,
		examplesAuto: 0,
		examplesDraft: 0,
		wordsWithExamples: 0,
		wordsWithoutExamples: 0,
		badExampleWarnings: [],
		duplicateSetNames: [],
	};
}

async function resolveImportSetTitle(
	baseTitle: string,
	existingTitles: Set<string>,
): Promise<string> {
	if (!existingTitles.has(baseTitle)) {
		existingTitles.add(baseTitle);
		return baseTitle;
	}
	let suffix = 2;
	while (existingTitles.has(`${baseTitle} (import ${suffix})`)) suffix++;
	const resolved = `${baseTitle} (import ${suffix})`;
	existingTitles.add(resolved);
	return resolved;
}

export async function buildContentExportWorkbook(): Promise<Buffer> {
	const [groups, hanzi, words] = await Promise.all([
		prisma.cnSimilarGroup.findMany({ orderBy: { key: 'asc' } }),
		prisma.cnHanzi.findMany({ include: { similarGroup: true }, orderBy: { char: 'asc' } }),
		prisma.cnWord.findMany({
			include: {
				chars: { include: { hanzi: true }, orderBy: { position: 'asc' } },
				examples: { orderBy: { id: 'asc' } },
				patterns: { orderBy: { id: 'asc' } },
			},
			orderBy: { simplified: 'asc' },
		}),
	]);

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(words.map((w) => ({
		simplified: w.simplified,
		pinyin: w.pinyin,
		han_viet: w.hanViet,
		meaning_vi: w.meaningVi,
		part_of_speech: w.partOfSpeech,
		mnemonic_vi: w.mnemonicVi,
		hsk_level: w.hskLevel ?? '',
		example_hanzi: w.examples[0]?.hanzi ?? '',
		example_pinyin: w.examples[0]?.pinyin ?? '',
		example_meaning_vi: w.examples[0]?.meaningVi ?? '',
		example_sentences: w.examples.length
			? w.examples.map((ex) => `${ex.hanzi}|${ex.pinyin}|${ex.meaningVi}`).join('||')
			: '',
		pattern_template: w.patterns[0]?.template ?? '',
		pattern_samples: w.patterns[0]
			? (Array.isArray(w.patterns[0].samples)
				? (w.patterns[0].samples as Array<{ hanzi: string; pinyin: string; meaningVi: string }>)
					.map((s) => `${s.hanzi}|${s.pinyin}|${s.meaningVi}`).join('||')
				: '')
			: '',
		chars: w.chars.map((c) => c.hanzi.char).join('|'),
		status: w.status,
	}))), 'words');
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hanzi.map((h) => ({
		char: h.char,
		pinyin: h.pinyin,
		han_viet: h.hanViet,
		meaning_vi: h.meaningVi,
		components: h.components.join('|'),
		radical: h.radical,
		mnemonic_vi: h.mnemonicVi,
		similar_group: h.similarGroup?.key ?? '',
		status: h.status,
	}))), 'hanzi');
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groups.map((g) => ({
		key: g.key,
		note: g.note,
	}))), 'similar_groups');
	return workbookBuffer(wb);
}

export async function buildUserDataExportWorkbook(userId: string): Promise<Buffer> {
	const [sets, progress, logs] = await Promise.all([
		prisma.cnWordSet.findMany({
			where: { userId },
			include: { items: { include: { word: true }, orderBy: { rawTerm: 'asc' } } },
			orderBy: { updatedAt: 'desc' },
		}),
		prisma.cnWordProgress.findMany({
			where: { userId },
			include: { word: true },
			orderBy: { updatedAt: 'desc' },
		}),
		prisma.cnAnswerLog.findMany({
			where: { userId },
			include: { word: true },
			orderBy: { createdAt: 'desc' },
			take: 5000,
		}),
	]);

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sets.map((set) => ({
		set_key: set.id,
		title: set.title,
		description: set.description,
		source: set.source,
	}))), 'sets');
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sets.flatMap((set) =>
		set.items.map((item) => ({
			set_key: set.id,
			raw_term: item.rawTerm,
			word_simplified: item.word?.simplified ?? '',
		})),
	)), 'set_items');
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(progress.map((p) => ({
		word_simplified: p.word.simplified,
		state: p.state,
		due_at: p.dueAt.toISOString(),
		interval_idx: p.intervalIdx,
		last_reviewed_at: p.lastReviewedAt?.toISOString() ?? '',
		meaning_correct: p.meaningCorrect,
		meaning_total: p.meaningTotal,
		listening_correct: p.listeningCorrect,
		listening_total: p.listeningTotal,
		pinyin_correct: p.pinyinCorrect,
		pinyin_total: p.pinyinTotal,
		sentence_correct: p.sentenceCorrect,
		sentence_total: p.sentenceTotal,
		meaning_due_at: p.meaningDueAt?.toISOString() ?? '',
		meaning_interval_idx: p.meaningIntervalIdx,
		listening_due_at: p.listeningDueAt?.toISOString() ?? '',
		listening_interval_idx: p.listeningIntervalIdx,
		pinyin_due_at: p.pinyinDueAt?.toISOString() ?? '',
		pinyin_interval_idx: p.pinyinIntervalIdx,
		sentence_due_at: p.sentenceDueAt?.toISOString() ?? '',
		sentence_interval_idx: p.sentenceIntervalIdx,
	}))), 'progress');
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logs.map((log) => ({
		word_simplified: log.word.simplified,
		question_type: log.questionType,
		error_type: log.errorType ?? '',
		correct: log.correct,
		created_at: log.createdAt.toISOString(),
	}))), 'answer_logs');
	return workbookBuffer(wb);
}

export interface UserWorkbookPreview {
	sets: number;
	items: number;
	progress: number;
	answerLogs: number;
	matchedWords: number;
	pendingWords: number;
	errors: string[];
	warnings: string[];
	totalRows: number;
	validWords: number;
	setsCount: number;
	examplesTotal: number;
	examplesAuto: number;
	examplesDraft: number;
	wordsWithExamples: number;
	wordsWithoutExamples: number;
	badExampleWarnings: BadExampleWarning[];
	duplicateSetNames: string[];
}

async function previewTuVungWorkbook(
	workbook: XLSX.WorkBook,
	userId?: string,
): Promise<UserWorkbookPreview> {
	const errors: string[] = [];
	const warnings: string[] = [];
	const rows = sanitizeSheetRows(rowsFromSheet(workbook, 'tu_vung'));
	const parsedRows = parseTuVungRows(rows);

	if (!parsedRows.length) {
		errors.push('Sheet tu_vung trống hoặc không có dòng hợp lệ');
	}

	const seenSimplified = new Set<string>();
	const boTuSet = new Set<string>();
	let validWords = 0;

	for (const row of parsedRows) {
		let rowValid = true;
		if (!row.boTu) {
			errors.push(`tu_vung dòng ${row.rowNumber}: thiếu bo_tu`);
			rowValid = false;
		}
		if (!row.simplified) {
			errors.push(`tu_vung dòng ${row.rowNumber}: thiếu simplified`);
			rowValid = false;
		}
		if (!row.pinyin) {
			errors.push(`tu_vung dòng ${row.rowNumber}: thiếu pinyin`);
			rowValid = false;
		}
		if (!row.meaningVi) {
			errors.push(`tu_vung dòng ${row.rowNumber}: thiếu meaning_vi`);
			rowValid = false;
		}
		if (row.simplified) {
			if (seenSimplified.has(row.simplified)) {
				errors.push(`tu_vung dòng ${row.rowNumber}: simplified "${row.simplified}" bị trùng trong file`);
				rowValid = false;
			} else {
				seenSimplified.add(row.simplified);
			}
		}
		if (row.boTu) boTuSet.add(row.boTu);
		if (!rowValid) continue;

		validWords++;
	}

	const itemCountBySet = new Map<string, number>();
	for (const row of parsedRows) {
		if (!row.boTu || !row.simplified || !row.pinyin || !row.meaningVi) continue;
		itemCountBySet.set(row.boTu, (itemCountBySet.get(row.boTu) ?? 0) + 1);
	}
	for (const [boTu, count] of itemCountBySet) {
		if (count > MAX_CN_TERMS_PER_SET) {
			warnings.push(`Bộ "${boTu}": ${count} từ — chỉ import tối đa ${MAX_CN_TERMS_PER_SET} từ (bỏ qua phần dư)`);
		}
	}

	let duplicateSetNames: string[] = [];
	if (userId && boTuSet.size) {
		const existingSets = await prisma.cnWordSet.findMany({
			where: { userId, title: { in: [...boTuSet] } },
			select: { title: true },
		});
		duplicateSetNames = existingSets.map((set) => set.title);
		for (const name of duplicateSetNames) {
			warnings.push(`Bộ "${name}" đã tồn tại — import sẽ tạo bộ mới với hậu tố (import N).`);
		}
	}

	return {
		sets: boTuSet.size,
		items: validWords,
		progress: 0,
		answerLogs: 0,
		matchedWords: validWords,
		pendingWords: 0,
		errors,
		warnings,
		totalRows: parsedRows.length,
		validWords,
		setsCount: boTuSet.size,
		examplesTotal: 0,
		examplesAuto: 0,
		examplesDraft: 0,
		wordsWithExamples: 0,
		wordsWithoutExamples: validWords,
		badExampleWarnings: [],
		duplicateSetNames,
	};
}

async function previewLegacyWorkbook(workbook: XLSX.WorkBook): Promise<UserWorkbookPreview> {
	const errors: string[] = [];
	const warnings: string[] = [];
	const sets = sanitizeSheetRows(rowsFromSheet(workbook, 'sets'));
	const items = sanitizeSheetRows(rowsFromSheet(workbook, 'set_items'));
	const progress = sanitizeSheetRows(rowsFromSheet(workbook, 'progress'));
	const logs = sanitizeSheetRows(rowsFromSheet(workbook, 'answer_logs'));

	if (!sets.length) errors.push('Thiếu sheet sets hoặc không có dòng hợp lệ');
	if (!items.length) warnings.push('Sheet set_items trống — import sẽ chỉ tạo metadata bộ từ');

	const seenSetKeys = new Set<string>();
	for (const [i, row] of sets.entries()) {
		const setKey = getField(row, 'set_key', 'setKey');
		if (!setKey) errors.push(`sets dòng ${i + 2}: thiếu set_key`);
		else if (seenSetKeys.has(setKey)) errors.push(`sets dòng ${i + 2}: set_key "${setKey}" bị trùng`);
		else seenSetKeys.add(setKey);
		if (!getField(row, 'title')) errors.push(`sets dòng ${i + 2}: thiếu title`);
		const source = getField(row, 'source') || 'manual';
		if (!VALID_SET_SOURCES.has(source)) errors.push(`sets dòng ${i + 2}: source không hợp lệ (${source})`);
	}

	const setKeys = new Set(sets.map((r) => getField(r, 'set_key', 'setKey')).filter(Boolean));
	const seenItems = new Set<string>();
	const itemCountBySet = new Map<string, number>();
	for (const [i, row] of items.entries()) {
		const setKey = getField(row, 'set_key', 'setKey');
		const rawTerm = normalizeTerm(getField(row, 'raw_term', 'rawTerm', 'term'));
		if (!setKeys.has(setKey)) errors.push(`set_items dòng ${i + 2}: set_key "${setKey || '(trống)'}" không tồn tại trong sheet sets`);
		if (!rawTerm) errors.push(`set_items dòng ${i + 2}: thiếu raw_term`);
		const itemKey = `${setKey}::${rawTerm}`;
		if (seenItems.has(itemKey)) warnings.push(`set_items dòng ${i + 2}: từ "${rawTerm}" trùng trong bộ "${setKey}"`);
		else seenItems.add(itemKey);
		if (setKey) itemCountBySet.set(setKey, (itemCountBySet.get(setKey) ?? 0) + 1);
	}
	for (const [setKey, count] of itemCountBySet) {
		if (count > MAX_CN_TERMS_PER_SET) {
			warnings.push(`Bộ "${setKey}": ${count} từ — chỉ import tối đa ${MAX_CN_TERMS_PER_SET} từ (bỏ qua phần dư)`);
		}
	}

	const termsToCheck = new Set<string>();
	for (const row of items) {
		const rawTerm = normalizeTerm(getField(row, 'raw_term', 'rawTerm', 'term'));
		const simplified = getField(row, 'word_simplified', 'wordSimplified', 'simplified') || rawTerm;
		if (simplified) termsToCheck.add(simplified);
	}
	let matchedWords = 0;
	let pendingWords = 0;
	if (termsToCheck.size) {
		const published = await prisma.cnWord.findMany({
			where: { simplified: { in: [...termsToCheck] }, status: 'published' },
			select: { simplified: true },
		});
		const found = new Set(published.map((w) => w.simplified));
		matchedWords = found.size;
		const pending = [...termsToCheck].filter((t) => !found.has(t));
		pendingWords = pending.length;
		if (pending.length) {
			warnings.push(`${pending.length} từ chưa có trong thư viện — vẫn import được, hiển thị trạng thái "chờ bổ sung"`);
			for (const term of pending.slice(0, 8)) warnings.push(`  · ${term}`);
			if (pending.length > 8) warnings.push(`  · … và ${pending.length - 8} từ khác`);
		}
	}

	for (const [i, row] of progress.entries()) {
		const state = getField(row, 'state') as CnWordProgressState;
		if (!getField(row, 'word_simplified', 'wordSimplified', 'simplified')) {
			errors.push(`progress dòng ${i + 2}: thiếu word_simplified`);
		}
		if (!VALID_PROGRESS_STATES.has(state)) errors.push(`progress dòng ${i + 2}: state không hợp lệ`);
		for (const pair of [
			['meaning_correct', 'meaning_total'],
			['listening_correct', 'listening_total'],
			['pinyin_correct', 'pinyin_total'],
			['sentence_correct', 'sentence_total'],
			['char_correct', 'char_total'],
		] as const) {
			const correct = asInt(row[pair[0]] ?? row[pair[0].replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())]);
			const total = asInt(row[pair[1]] ?? row[pair[1].replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())]);
			if (correct < 0 || total < 0 || correct > total) {
				errors.push(`progress dòng ${i + 2}: ${pair[0]} phải nằm trong khoảng 0..${pair[1]}`);
			}
		}
	}

	for (const [i, row] of logs.entries()) {
		const questionType = getField(row, 'question_type', 'questionType') as CnQuestionType;
		const errorType = getField(row, 'error_type', 'errorType') as CnErrorType;
		const correct = ['true', '1', 'yes'].includes(getField(row, 'correct').toLowerCase()) || row.correct === true;
		if (!getField(row, 'word_simplified', 'wordSimplified', 'simplified')) {
			errors.push(`answer_logs dòng ${i + 2}: thiếu word_simplified`);
		}
		if (!VALID_QUESTION_TYPES.has(questionType)) errors.push(`answer_logs dòng ${i + 2}: question_type không hợp lệ`);
		if (errorType && !VALID_ERROR_TYPES.has(errorType)) errors.push(`answer_logs dòng ${i + 2}: error_type không hợp lệ`);
		if (correct && errorType) warnings.push(`answer_logs dòng ${i + 2}: correct=true nên error_type sẽ bị bỏ qua`);
	}

	return {
		sets: sets.length,
		items: items.length,
		progress: progress.length,
		answerLogs: logs.length,
		matchedWords,
		pendingWords,
		errors,
		warnings,
		...emptyTuVungPreviewFields(),
		totalRows: items.length,
		validWords: items.length,
		setsCount: sets.length,
	};
}

export async function previewUserWorkbook(file: File, userId?: string): Promise<UserWorkbookPreview> {
	const buffer = Buffer.from(await file.arrayBuffer());
	return previewUserWorkbookBuffer(buffer, userId);
}

async function previewUserWorkbookBuffer(buffer: Buffer, userId?: string): Promise<UserWorkbookPreview> {
	const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

	if (isTuVungFormat(workbook)) {
		return previewTuVungWorkbook(workbook, userId);
	}
	if (workbook.SheetNames.includes('sets')) {
		return previewLegacyWorkbook(workbook);
	}

	return {
		sets: 0,
		items: 0,
		progress: 0,
		answerLogs: 0,
		matchedWords: 0,
		pendingWords: 0,
		errors: ['File không đúng định dạng — cần sheet tu_vung (mới) hoặc sets + set_items (cũ).'],
		warnings: [],
		...emptyTuVungPreviewFields(),
	};
}

async function importTuVungWorkbook(
	userId: string,
	workbook: XLSX.WorkBook,
	preview: UserWorkbookPreview,
	options: ImportTuVungOptions = {},
): Promise<{ preview: UserWorkbookPreview; createdSetIds: string[] }> {
	const rows = sanitizeSheetRows(rowsFromSheet(workbook, 'tu_vung'));
	const parsedRows = parseTuVungRows(rows).filter(
		(row) => row.boTu && row.simplified && row.pinyin && row.meaningVi,
	);

	const existingSets = await prisma.cnWordSet.findMany({
		where: { userId },
		select: { title: true },
	});
	const existingTitles = new Set(existingSets.map((set) => set.title));
	const createdSetIds: string[] = [];

	await prisma.$transaction(async (tx) => {
		const wordIdBySimplified = new Map<string, string>();

		for (const row of parsedRows) {
			const word = await tx.cnWord.upsert({
				where: { simplified: row.simplified },
				create: {
					simplified: row.simplified,
					pinyin: row.pinyin,
					hanViet: row.hanViet,
					meaningVi: row.meaningVi,
					partOfSpeech: row.partOfSpeech,
					ghiChu: row.ghiChu,
					status: 'published',
				},
				update: {
					pinyin: row.pinyin,
					hanViet: row.hanViet,
					meaningVi: row.meaningVi,
					partOfSpeech: row.partOfSpeech,
					ghiChu: row.ghiChu,
					status: 'published',
				},
			});
			wordIdBySimplified.set(row.simplified, word.id);
		}

		const rowsBySet = new Map<string, ParsedTuVungRow[]>();
		for (const row of parsedRows) {
			const group = rowsBySet.get(row.boTu) ?? [];
			group.push(row);
			rowsBySet.set(row.boTu, group);
		}

		for (const [boTu, setRows] of rowsBySet) {
			const title = options.preserveSetTitle
				? boTu
				: await resolveImportSetTitle(boTu, existingTitles);
			if (!options.preserveSetTitle) {
				existingTitles.add(title);
			}
			const set = await tx.cnWordSet.create({
				data: {
					userId,
					title,
					description: options.setDescription ?? '',
					source: 'textbook',
				},
			});
			createdSetIds.push(set.id);

			const seenTerms = new Set<string>();
			for (const row of setRows) {
				if (seenTerms.size >= MAX_CN_TERMS_PER_SET) continue;
				if (seenTerms.has(row.simplified)) continue;
				const wordId = wordIdBySimplified.get(row.simplified);
				if (!wordId) continue;
				await tx.cnWordSetItem.create({
					data: {
						setId: set.id,
						rawTerm: row.simplified,
						wordId,
					},
				});
				seenTerms.add(row.simplified);
			}
		}
	});

	return { preview, createdSetIds };
}

export interface ImportTuVungOptions {
	setDescription?: string;
	/** Use bo_tu as set title exactly (no import suffix) */
	preserveSetTitle?: boolean;
}

export interface ImportWorkbookBufferResult {
	preview: UserWorkbookPreview;
	createdSetIds: string[];
}

export async function importUserWorkbookBuffer(
	userId: string,
	buffer: Buffer,
	options: ImportTuVungOptions & { restoreProgress?: boolean } = {},
): Promise<ImportWorkbookBufferResult> {
	const preview = await previewUserWorkbookBuffer(buffer, userId);
	if (preview.errors.length) {
		return { preview, createdSetIds: [] };
	}

	const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
	const { restoreProgress = false, ...tuVungOptions } = options;

	if (isTuVungFormat(workbook)) {
		return importTuVungWorkbook(userId, workbook, preview, tuVungOptions);
	}
	if (workbook.SheetNames.includes('sets')) {
		const legacyPreview = await importLegacyWorkbook(userId, workbook, restoreProgress, preview);
		return { preview: legacyPreview, createdSetIds: [] };
	}

	return { preview, createdSetIds: [] };
}

async function importLegacyWorkbook(
	userId: string,
	workbook: XLSX.WorkBook,
	restoreProgress: boolean,
	preview: UserWorkbookPreview,
): Promise<UserWorkbookPreview> {
	const setRows = sanitizeSheetRows(rowsFromSheet(workbook, 'sets'));
	const itemRows = sanitizeSheetRows(rowsFromSheet(workbook, 'set_items'));
	const progressRows = sanitizeSheetRows(rowsFromSheet(workbook, 'progress'));
	const logRows = sanitizeSheetRows(rowsFromSheet(workbook, 'answer_logs'));

	const importedSetIds: string[] = [];

	await prisma.$transaction(async (tx) => {
		const setIdByKey = new Map<string, string>();
		for (const row of setRows) {
			const set = await tx.cnWordSet.create({
				data: {
					userId,
					title: getField(row, 'title'),
					description: getField(row, 'description'),
					source: (getField(row, 'source') || 'manual') as 'manual' | 'hsk' | 'textbook',
				},
			});
			setIdByKey.set(getField(row, 'set_key', 'setKey'), set.id);
			importedSetIds.push(set.id);
		}

		const seenTermsBySet = new Map<string, Set<string>>();
		for (const row of itemRows) {
			const setId = setIdByKey.get(getField(row, 'set_key', 'setKey'));
			if (!setId) continue;
			const seen = seenTermsBySet.get(setId) ?? new Set<string>();
			if (seen.size >= MAX_CN_TERMS_PER_SET) continue;
			const rawTerm = normalizeTerm(getField(row, 'raw_term', 'rawTerm', 'term'));
			if (!rawTerm || seen.has(rawTerm)) continue;
			const wordSimplified = getField(row, 'word_simplified', 'wordSimplified', 'simplified') || rawTerm;
			const word = await tx.cnWord.findFirst({
				where: { simplified: wordSimplified, status: 'published' },
				select: { id: true },
			});
			await tx.cnWordSetItem.upsert({
				where: { setId_rawTerm: { setId, rawTerm } },
				create: { setId, rawTerm, wordId: word?.id ?? null },
				update: { wordId: word?.id ?? null },
			});
			seen.add(rawTerm);
			seenTermsBySet.set(setId, seen);
		}

		if (restoreProgress) {
			for (const setId of setIdByKey.values()) {
				await tx.cnWordSet.update({ where: { id: setId }, data: { srsActive: true } });
			}
		}

		if (!restoreProgress) return;

		for (const row of progressRows) {
			const word = await tx.cnWord.findFirst({
				where: {
					simplified: getField(row, 'word_simplified', 'wordSimplified', 'simplified'),
					status: 'published',
				},
				select: { id: true },
			});
			if (!word) continue;
			await tx.cnWordProgress.upsert({
				where: { userId_wordId: { userId, wordId: word.id } },
				create: {
					userId,
					wordId: word.id,
					state: getField(row, 'state') as CnWordProgressState,
					dueAt: asDate(row.due_at ?? row.dueAt) ?? new Date(),
					intervalIdx: asInt(row.interval_idx ?? row.intervalIdx),
					lastReviewedAt: asDate(row.last_reviewed_at ?? row.lastReviewedAt),
					meaningCorrect: asInt(row.meaning_correct ?? row.meaningCorrect),
					meaningTotal: asInt(row.meaning_total ?? row.meaningTotal),
					listeningCorrect: asInt(row.listening_correct ?? row.listeningCorrect),
					listeningTotal: asInt(row.listening_total ?? row.listeningTotal),
					pinyinCorrect: asInt(row.pinyin_correct ?? row.pinyinCorrect),
					pinyinTotal: asInt(row.pinyin_total ?? row.pinyinTotal),
					sentenceCorrect: asInt(row.sentence_correct ?? row.sentenceCorrect),
					sentenceTotal: asInt(row.sentence_total ?? row.sentenceTotal),
					meaningDueAt: asDate(row.meaning_due_at ?? row.meaningDueAt),
					meaningIntervalIdx: asInt(row.meaning_interval_idx ?? row.meaningIntervalIdx),
					listeningDueAt: asDate(row.listening_due_at ?? row.listeningDueAt),
					listeningIntervalIdx: asInt(row.listening_interval_idx ?? row.listeningIntervalIdx),
					pinyinDueAt: asDate(row.pinyin_due_at ?? row.pinyinDueAt),
					pinyinIntervalIdx: asInt(row.pinyin_interval_idx ?? row.pinyinIntervalIdx),
					sentenceDueAt: asDate(row.sentence_due_at ?? row.sentenceDueAt),
					sentenceIntervalIdx: asInt(row.sentence_interval_idx ?? row.sentenceIntervalIdx),
				},
				update: {
					state: getField(row, 'state') as CnWordProgressState,
					dueAt: asDate(row.due_at ?? row.dueAt) ?? new Date(),
					intervalIdx: asInt(row.interval_idx ?? row.intervalIdx),
					lastReviewedAt: asDate(row.last_reviewed_at ?? row.lastReviewedAt),
					meaningCorrect: asInt(row.meaning_correct ?? row.meaningCorrect),
					meaningTotal: asInt(row.meaning_total ?? row.meaningTotal),
					listeningCorrect: asInt(row.listening_correct ?? row.listeningCorrect),
					listeningTotal: asInt(row.listening_total ?? row.listeningTotal),
					pinyinCorrect: asInt(row.pinyin_correct ?? row.pinyinCorrect),
					pinyinTotal: asInt(row.pinyin_total ?? row.pinyinTotal),
					sentenceCorrect: asInt(row.sentence_correct ?? row.sentenceCorrect),
					sentenceTotal: asInt(row.sentence_total ?? row.sentenceTotal),
					meaningDueAt: asDate(row.meaning_due_at ?? row.meaningDueAt),
					meaningIntervalIdx: asInt(row.meaning_interval_idx ?? row.meaningIntervalIdx),
					listeningDueAt: asDate(row.listening_due_at ?? row.listeningDueAt),
					listeningIntervalIdx: asInt(row.listening_interval_idx ?? row.listeningIntervalIdx),
					pinyinDueAt: asDate(row.pinyin_due_at ?? row.pinyinDueAt),
					pinyinIntervalIdx: asInt(row.pinyin_interval_idx ?? row.pinyinIntervalIdx),
					sentenceDueAt: asDate(row.sentence_due_at ?? row.sentenceDueAt),
					sentenceIntervalIdx: asInt(row.sentence_interval_idx ?? row.sentenceIntervalIdx),
				},
			});
		}

		for (const row of logRows) {
			const word = await tx.cnWord.findFirst({
				where: {
					simplified: getField(row, 'word_simplified', 'wordSimplified', 'simplified'),
					status: 'published',
				},
				select: { id: true },
			});
			if (!word) continue;
			const correct = ['true', '1', 'yes'].includes(getField(row, 'correct').toLowerCase()) || row.correct === true;
			await tx.cnAnswerLog.create({
				data: {
					userId,
					wordId: word.id,
					questionType: getField(row, 'question_type', 'questionType') as CnQuestionType,
					errorType: correct ? null : (getField(row, 'error_type', 'errorType') as CnErrorType || null),
					correct,
					createdAt: asDate(row.created_at ?? row.createdAt) ?? new Date(),
				},
			});
		}
	});

	if (restoreProgress) {
		for (const setId of importedSetIds) {
			const items = await prisma.cnWordSetItem.findMany({
				where: { setId, wordId: { not: null } },
				select: { wordId: true },
			});
			await enrollWordsInSrs(userId, items.map((item) => item.wordId!));
		}
	}

	return preview;
}

export async function importUserWorkbook(
	userId: string,
	file: File,
	restoreProgress: boolean,
): Promise<UserWorkbookPreview> {
	const buffer = Buffer.from(await file.arrayBuffer());
	const { preview } = await importUserWorkbookBuffer(userId, buffer, { restoreProgress });
	return preview;
}
