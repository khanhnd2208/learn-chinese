import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { syncCanonicalExamples } from '@/services/chinese/cnExampleSync';
import { AppError } from '@/lib/appError';
import { MAX_CN_TERMS_PER_SET, MAX_IMPORT_ROWS, clampSrsIntervalIdx } from '@/config/constants';
import {
	buildExcelWorkbookBuffer,
	excelSerialNumberToDate,
	hasExcelSheet,
	readExcelWorkbook,
	rowsFromExcelSheet,
	type ExcelWorkbookData,
} from '@/lib/excelWorkbook';
import { normalizeTerm } from '@/lib/chinese/hanziUtils';
import { enrollNewWordsForActiveFollowers } from '@/services/chinese/cnEnrollmentService';
import { enrollWordsInSrs } from '@/services/chinese/cnSrsEnrollmentService';
import { CORE_QUESTION_TYPE_SET } from '@/lib/chinese/coreQuestionTypes';
import {
	MIN_FILL_EXAMPLES_PER_WORD,
	parseFillExampleCell,
	VI_DU_COLUMN_KEYS,
	type ParsedFillExample,
} from '@/lib/chinese/parseFillExample';
import { parsePastedTuVung } from '@/lib/chinese/aiImportPrompt';
import type { CnErrorType, CnQuestionType, CnWordProgressState } from '@/types/chinese';

type Row = Record<string, unknown>;

const VALID_SET_SOURCES = new Set(['manual', 'hsk', 'textbook']);
const VALID_PROGRESS_STATES = new Set<CnWordProgressState>([
	'new', 'learning', 'weak', 'familiar', 'strong', 'mastered',
]);
const VALID_QUESTION_TYPES = new Set<string>([
	...CORE_QUESTION_TYPE_SET,
	// Legacy types in historical exports / answer logs
	'pinyin_to_hanzi', 'hanzi_to_pinyin', 'hanzi_to_pinyin_typed',
	'audio_to_hanzi', 'audio_to_hanzi_typed', 'audio_to_meaning',
]);
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
		return excelSerialNumberToDate(value);
	}
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Read sound channel progress from row; merges legacy listening + pinyin columns if present */
function soundProgressFromRow(row: Row): {
	soundCorrect: number;
	soundTotal: number;
	soundDueAt: Date | null;
	soundIntervalIdx: number;
} {
	const soundCorrect = asInt(row.sound_correct ?? row.soundCorrect);
	const soundTotal = asInt(row.sound_total ?? row.soundTotal);
	const soundDueAt = asDate(row.sound_due_at ?? row.soundDueAt);
	const soundIntervalIdx = asInt(row.sound_interval_idx ?? row.soundIntervalIdx);

	const listeningCorrect = asInt(row.listening_correct ?? row.listeningCorrect);
	const listeningTotal = asInt(row.listening_total ?? row.listeningTotal);
	const pinyinCorrect = asInt(row.pinyin_correct ?? row.pinyinCorrect);
	const pinyinTotal = asInt(row.pinyin_total ?? row.pinyinTotal);
	const listeningIntervalIdx = asInt(row.listening_interval_idx ?? row.listeningIntervalIdx);
	const pinyinIntervalIdx = asInt(row.pinyin_interval_idx ?? row.pinyinIntervalIdx);
	const listeningDueAt = asDate(row.listening_due_at ?? row.listeningDueAt);
	const pinyinDueAt = asDate(row.pinyin_due_at ?? row.pinyinDueAt);

	const hasLegacy = listeningTotal > 0 || pinyinTotal > 0
		|| row.listening_correct !== undefined || row.listeningCorrect !== undefined
		|| row.pinyin_correct !== undefined || row.pinyinCorrect !== undefined;

	if (!hasLegacy) {
		return { soundCorrect, soundTotal, soundDueAt, soundIntervalIdx: clampSrsIntervalIdx(soundIntervalIdx) };
	}

	const mergedCorrect = soundCorrect + listeningCorrect + pinyinCorrect;
	const mergedTotal = soundTotal + listeningTotal + pinyinTotal;
	let mergedIntervalIdx = soundIntervalIdx;
	let mergedDueAt = soundDueAt;
	if (pinyinIntervalIdx > mergedIntervalIdx) {
		mergedIntervalIdx = pinyinIntervalIdx;
		mergedDueAt = pinyinDueAt ?? mergedDueAt;
	}
	if (listeningIntervalIdx > mergedIntervalIdx) {
		mergedIntervalIdx = listeningIntervalIdx;
		mergedDueAt = listeningDueAt ?? mergedDueAt;
	}
	return {
		soundCorrect: mergedCorrect,
		soundTotal: mergedTotal,
		soundDueAt: mergedDueAt,
		soundIntervalIdx: clampSrsIntervalIdx(mergedIntervalIdx),
	};
}

function rowsFromSheet(workbook: ExcelWorkbookData, sheetName: string): Row[] {
	return rowsFromExcelSheet(workbook, sheetName);
}

function sanitizeSheetRows(rows: Row[], maxRows = MAX_IMPORT_ROWS): Row[] {
	const nonEmpty = rows.filter((row) => Object.values(row).some((v) => asString(v)));
	if (nonEmpty.length > maxRows) {
		throw new AppError(`File có quá nhiều dòng (tối đa ${maxRows})`, 400);
	}
	return nonEmpty;
}

function isTuVungFormat(workbook: ExcelWorkbookData): boolean {
	return hasExcelSheet(workbook, 'tu_vung');
}

export interface BadExampleWarning {
	rowNumber: number;
	simplified: string;
	exampleIndex: 1 | 2 | 3 | 4 | 5;
	sentence: string;
	reason: string;
	/** Soft notes do not block the row. Omitted means the cell was rejected. */
	level?: 'warning' | 'error';
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
	examples: ParsedFillExample[];
}

function parseTuVungRows(rows: Row[]): ParsedTuVungRow[] {
	return rows.map((row, index) => {
		const ghiChu = getField(row, 'ghi_chu', 'ghiChu');
		const legacyMnemonic = getField(row, 'mnemonic_vi', 'mnemonicVi');
		const legacyUsage = getField(row, 'usage_note_vi', 'usageNoteVi');
		const mergedGhiChu = ghiChu
			|| [legacyMnemonic, legacyUsage].filter(Boolean).join(' ').trim();
		const simplified = getField(row, 'simplified');
		const meaningVi = getField(row, 'meaning_vi', 'meaningVi');
		const examples: ParsedFillExample[] = [];
		for (const key of VI_DU_COLUMN_KEYS) {
			const raw = getField(row, key);
			if (!raw) continue;
			const parsed = parseFillExampleCell(raw, simplified, meaningVi);
			if (parsed.ok) examples.push(parsed.example);
		}

		return {
			rowNumber: index + 2,
			boTu: getField(row, 'bo_tu', 'boTu'),
			simplified,
			pinyin: getField(row, 'pinyin'),
			meaningVi,
			hanViet: getField(row, 'han_viet', 'hanViet'),
			partOfSpeech: getField(row, 'part_of_speech', 'partOfSpeech'),
			ghiChu: mergedGhiChu,
			examples,
		};
	});
}

/** Only admins may add or change words. Learners can only pick words that already exist. */
export interface WordWritePolicy {
	canCreateWords?: boolean;
}

const MAX_SKIPPED_WORDS_LISTED = 20;

async function findPublishedWordIds(
	db: Pick<Prisma.TransactionClient, 'cnWord'>,
	simplifiedList: string[],
): Promise<Map<string, string>> {
	const unique = [...new Set(simplifiedList.filter(Boolean))];
	if (!unique.length) return new Map();
	const rows = await db.cnWord.findMany({
		where: { simplified: { in: unique }, status: 'published' },
		select: { id: true, simplified: true },
	});
	return new Map(rows.map((row) => [row.simplified, row.id]));
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
				examples: { where: { ownerUserId: null }, orderBy: { id: 'asc' } },
				patterns: { orderBy: { id: 'asc' } },
			},
			orderBy: { simplified: 'asc' },
		}),
	]);

	return buildExcelWorkbookBuffer([
		{
			name: 'words',
			rows: words.map((w) => ({
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
	})),
		},
		{
			name: 'hanzi',
			rows: hanzi.map((h) => ({
		char: h.char,
		pinyin: h.pinyin,
		han_viet: h.hanViet,
		meaning_vi: h.meaningVi,
		components: h.components.join('|'),
		radical: h.radical,
		mnemonic_vi: h.mnemonicVi,
		similar_group: h.similarGroup?.key ?? '',
		status: h.status,
	})),
		},
		{
			name: 'similar_groups',
			rows: groups.map((g) => ({
		key: g.key,
		note: g.note,
	})),
		},
	]);
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

	return buildExcelWorkbookBuffer([
		{
			name: 'sets',
			rows: sets.map((set) => ({
		set_key: set.id,
		title: set.title,
		description: set.description,
		source: set.source,
	})),
		},
		{
			name: 'set_items',
			rows: sets.flatMap((set) =>
				set.items.map((item) => ({
			set_key: set.id,
			raw_term: item.rawTerm,
			word_simplified: item.word?.simplified ?? '',
		})),
			),
		},
		{
			name: 'progress',
			rows: progress.map((p) => ({
		word_simplified: p.word.simplified,
		state: p.state,
		due_at: p.dueAt.toISOString(),
		interval_idx: p.intervalIdx,
		last_reviewed_at: p.lastReviewedAt?.toISOString() ?? '',
		meaning_correct: p.meaningCorrect,
		meaning_total: p.meaningTotal,
		sound_correct: p.soundCorrect,
		sound_total: p.soundTotal,
		sentence_correct: p.sentenceCorrect,
		sentence_total: p.sentenceTotal,
		meaning_due_at: p.meaningDueAt?.toISOString() ?? '',
		meaning_interval_idx: p.meaningIntervalIdx,
		sound_due_at: p.soundDueAt?.toISOString() ?? '',
		sound_interval_idx: p.soundIntervalIdx,
		sentence_due_at: p.sentenceDueAt?.toISOString() ?? '',
		sentence_interval_idx: p.sentenceIntervalIdx,
	})),
		},
		{
			name: 'answer_logs',
			rows: logs.map((log) => ({
		word_simplified: log.word.simplified,
		question_type: log.questionType,
		error_type: log.errorType ?? '',
		correct: log.correct,
		created_at: log.createdAt.toISOString(),
	})),
		},
	]);
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
	workbook: ExcelWorkbookData,
	userId?: string,
	policy: WordWritePolicy = {},
): Promise<UserWorkbookPreview> {
	const canCreateWords = policy.canCreateWords === true;
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
	let examplesTotal = 0;
	let examplesAuto = 0;
	let examplesRepaired = 0;
	let wordsWithExamples = 0;
	const badExampleWarnings: BadExampleWarning[] = [];
	const validSimplified: string[] = [];

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
		if (canCreateWords && !row.pinyin) {
			errors.push(`tu_vung dòng ${row.rowNumber}: thiếu pinyin`);
			rowValid = false;
		}
		if (canCreateWords && !row.meaningVi) {
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

		if (canCreateWords && row.simplified && row.meaningVi) {
			const rawRow = rows[row.rowNumber - 2];
			for (let i = 0; i < VI_DU_COLUMN_KEYS.length; i++) {
				const key = VI_DU_COLUMN_KEYS[i];
				const rawStr = getField(rawRow, key);
				if (!rawStr) continue;
				const parsed = parseFillExampleCell(rawStr, row.simplified, row.meaningVi);
				if (!parsed.ok) {
					badExampleWarnings.push({
						rowNumber: row.rowNumber,
						simplified: row.simplified,
						exampleIndex: (i + 1) as 1 | 2 | 3 | 4 | 5,
						sentence: rawStr,
						reason: parsed.reason,
						level: 'error',
					});
				} else if (parsed.warning) {
					badExampleWarnings.push({
						rowNumber: row.rowNumber,
						simplified: row.simplified,
						exampleIndex: (i + 1) as 1 | 2 | 3 | 4 | 5,
						sentence: rawStr,
						reason: parsed.warning,
						level: 'warning',
					});
				}
			}
			if (row.examples.length < MIN_FILL_EXAMPLES_PER_WORD) {
				errors.push(
					`tu_vung dòng ${row.rowNumber} (${row.simplified}): cần đúng ${MIN_FILL_EXAMPLES_PER_WORD} ví dụ hợp lệ (vi_du_1…vi_du_5), hiện có ${row.examples.length} — xem chi tiết bên dưới`,
				);
				rowValid = false;
			} else {
				examplesTotal += row.examples.length;
				examplesAuto += row.examples.length;
				examplesRepaired += row.examples.filter((ex) => ex.repaired).length;
				wordsWithExamples++;
			}
		}

		if (row.boTu) boTuSet.add(row.boTu);
		if (!rowValid) continue;

		validWords++;
		validSimplified.push(row.simplified);
	}

	let pendingWords = 0;
	let knownSimplified = new Set(validSimplified);
	if (!canCreateWords) {
		const known = await findPublishedWordIds(prisma, validSimplified);
		knownSimplified = new Set(known.keys());
		const missing = validSimplified.filter((term) => !known.has(term));
		pendingWords = missing.length;
		validWords -= missing.length;
		wordsWithExamples = validWords;
		if (missing.length) {
			const listed = missing.slice(0, MAX_SKIPPED_WORDS_LISTED).join(', ');
			const more = missing.length > MAX_SKIPPED_WORDS_LISTED
				? ` và ${missing.length - MAX_SKIPPED_WORDS_LISTED} từ khác`
				: '';
			warnings.push(
				`${missing.length} từ chưa có trong hệ thống nên sẽ bị bỏ qua: ${listed}${more}. Nhờ admin thêm các từ này.`,
			);
		}
		if (parsedRows.length > 0 && validWords === 0 && errors.length === 0) {
			errors.push('Không có từ nào trong file đã có trong hệ thống. Chỉ admin mới thêm được từ mới.');
		}
	}

	const itemCountBySet = new Map<string, number>();
	for (const row of parsedRows) {
		if (!row.boTu || !row.simplified) continue;
		if (canCreateWords && (!row.pinyin || !row.meaningVi)) continue;
		if (!knownSimplified.has(row.simplified)) continue;
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

	if (examplesRepaired > 0) {
		warnings.push(
			`Đã tự thêm dấu trống cho ${examplesRepaired} câu — kiểm tra lại trước khi import`,
		);
	}

	return {
		sets: boTuSet.size,
		items: validWords,
		progress: 0,
		answerLogs: 0,
		matchedWords: validWords,
		pendingWords,
		errors,
		warnings,
		totalRows: parsedRows.length,
		validWords,
		setsCount: boTuSet.size,
		examplesTotal,
		examplesAuto,
		examplesDraft: 0,
		wordsWithExamples,
		wordsWithoutExamples: Math.max(0, validWords - wordsWithExamples),
		badExampleWarnings,
		duplicateSetNames,
	};
}

async function previewLegacyWorkbook(workbook: ExcelWorkbookData): Promise<UserWorkbookPreview> {
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
			['sound_correct', 'sound_total'],
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

export async function previewUserWorkbook(
	file: File,
	userId?: string,
	policy: WordWritePolicy = {},
): Promise<UserWorkbookPreview> {
	const buffer = Buffer.from(await file.arrayBuffer());
	return previewUserWorkbookBuffer(buffer, userId, policy);
}

export async function previewUserWorkbookBuffer(
	buffer: Buffer,
	userId?: string,
	policy: WordWritePolicy = {},
): Promise<UserWorkbookPreview> {
	const workbook = await readExcelWorkbook(buffer);

	if (isTuVungFormat(workbook)) {
		return previewTuVungWorkbook(workbook, userId, policy);
	}
	if (hasExcelSheet(workbook, 'sets')) {
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

function filterValidTuVungRows(parsedRows: ParsedTuVungRow[], canCreateWords: boolean): ParsedTuVungRow[] {
	if (!canCreateWords) {
		return parsedRows.filter((row) => row.boTu && row.simplified);
	}
	return parsedRows.filter(
		(row) => row.boTu && row.simplified && row.pinyin && row.meaningVi
			&& row.examples.length >= MIN_FILL_EXAMPLES_PER_WORD,
	);
}

type ImportActor = { kind: 'admin' } | { kind: 'learner' };

async function upsertTuVungWordsAndExamples(
	tx: Prisma.TransactionClient,
	parsedRows: ParsedTuVungRow[],
	actor: ImportActor,
): Promise<Map<string, string>> {
	if (actor.kind === 'learner') {
		// Learners never write words or examples. They only link words that already exist.
		return findPublishedWordIds(tx, parsedRows.map((row) => row.simplified));
	}

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

		await syncCanonicalExamples(tx, word.id, row.examples);
	}

	return wordIdBySimplified;
}

async function importTuVungWorkbook(
	userId: string,
	workbook: ExcelWorkbookData,
	preview: UserWorkbookPreview,
	options: ImportTuVungOptions = {},
	policy: WordWritePolicy = {},
): Promise<{ preview: UserWorkbookPreview; createdSetIds: string[] }> {
	const canCreateWords = policy.canCreateWords === true;
	const rows = sanitizeSheetRows(rowsFromSheet(workbook, 'tu_vung'));
	const parsedRows = filterValidTuVungRows(parseTuVungRows(rows), canCreateWords);

	const existingSets = await prisma.cnWordSet.findMany({
		where: { userId },
		select: { title: true },
	});
	const existingTitles = new Set(existingSets.map((set) => set.title));
	const createdSetIds: string[] = [];

	await prisma.$transaction(async (tx) => {
		const wordIdBySimplified = await upsertTuVungWordsAndExamples(
			tx,
			parsedRows,
			canCreateWords ? { kind: 'admin' } : { kind: 'learner' },
		);

		const rowsBySet = new Map<string, ParsedTuVungRow[]>();
		for (const row of parsedRows) {
			if (!wordIdBySimplified.has(row.simplified)) continue;
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
	options: ImportTuVungOptions & WordWritePolicy & { restoreProgress?: boolean } = {},
): Promise<ImportWorkbookBufferResult> {
	const { canCreateWords, ...importOptions } = options;
	const policy: WordWritePolicy = { canCreateWords };
	const preview = await previewUserWorkbookBuffer(buffer, userId, policy);
	if (preview.errors.length) {
		return { preview, createdSetIds: [] };
	}

	const workbook = await readExcelWorkbook(buffer);
	const { restoreProgress = false, ...tuVungOptions } = importOptions;

	if (isTuVungFormat(workbook)) {
		return importTuVungWorkbook(userId, workbook, preview, tuVungOptions, policy);
	}
	if (hasExcelSheet(workbook, 'sets')) {
		const legacyPreview = await importLegacyWorkbook(userId, workbook, restoreProgress, preview);
		return { preview: legacyPreview, createdSetIds: [] };
	}

	return { preview, createdSetIds: [] };
}

async function importLegacyWorkbook(
	userId: string,
	workbook: ExcelWorkbookData,
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
				await tx.cnSetEnrollment.upsert({
					where: { userId_setId: { userId, setId } },
					create: { userId, setId, srsActive: true },
					update: { srsActive: true },
				});
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
			const soundProgress = soundProgressFromRow(row);
			await tx.cnWordProgress.upsert({
				where: { userId_wordId: { userId, wordId: word.id } },
				create: {
					userId,
					wordId: word.id,
					state: getField(row, 'state') as CnWordProgressState,
					dueAt: asDate(row.due_at ?? row.dueAt) ?? new Date(),
					intervalIdx: clampSrsIntervalIdx(asInt(row.interval_idx ?? row.intervalIdx)),
					lastReviewedAt: asDate(row.last_reviewed_at ?? row.lastReviewedAt),
					meaningCorrect: asInt(row.meaning_correct ?? row.meaningCorrect),
					meaningTotal: asInt(row.meaning_total ?? row.meaningTotal),
					soundCorrect: soundProgress.soundCorrect,
					soundTotal: soundProgress.soundTotal,
					sentenceCorrect: asInt(row.sentence_correct ?? row.sentenceCorrect),
					sentenceTotal: asInt(row.sentence_total ?? row.sentenceTotal),
					meaningDueAt: asDate(row.meaning_due_at ?? row.meaningDueAt),
					meaningIntervalIdx: clampSrsIntervalIdx(asInt(row.meaning_interval_idx ?? row.meaningIntervalIdx)),
					soundDueAt: soundProgress.soundDueAt,
					soundIntervalIdx: soundProgress.soundIntervalIdx,
					sentenceDueAt: asDate(row.sentence_due_at ?? row.sentenceDueAt),
					sentenceIntervalIdx: clampSrsIntervalIdx(asInt(row.sentence_interval_idx ?? row.sentenceIntervalIdx)),
				},
				update: {
					state: getField(row, 'state') as CnWordProgressState,
					dueAt: asDate(row.due_at ?? row.dueAt) ?? new Date(),
					intervalIdx: clampSrsIntervalIdx(asInt(row.interval_idx ?? row.intervalIdx)),
					lastReviewedAt: asDate(row.last_reviewed_at ?? row.lastReviewedAt),
					meaningCorrect: asInt(row.meaning_correct ?? row.meaningCorrect),
					meaningTotal: asInt(row.meaning_total ?? row.meaningTotal),
					soundCorrect: soundProgress.soundCorrect,
					soundTotal: soundProgress.soundTotal,
					sentenceCorrect: asInt(row.sentence_correct ?? row.sentenceCorrect),
					sentenceTotal: asInt(row.sentence_total ?? row.sentenceTotal),
					meaningDueAt: asDate(row.meaning_due_at ?? row.meaningDueAt),
					meaningIntervalIdx: clampSrsIntervalIdx(asInt(row.meaning_interval_idx ?? row.meaningIntervalIdx)),
					soundDueAt: soundProgress.soundDueAt,
					soundIntervalIdx: soundProgress.soundIntervalIdx,
					sentenceDueAt: asDate(row.sentence_due_at ?? row.sentenceDueAt),
					sentenceIntervalIdx: clampSrsIntervalIdx(asInt(row.sentence_interval_idx ?? row.sentenceIntervalIdx)),
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
	policy: WordWritePolicy = {},
): Promise<UserWorkbookPreview> {
	const buffer = Buffer.from(await file.arrayBuffer());
	const { preview } = await importUserWorkbookBuffer(userId, buffer, { restoreProgress, ...policy });
	return preview;
}

function buildTuVungWorkbookBuffer(rows: Record<string, string>[]): Promise<Buffer> {
	return buildExcelWorkbookBuffer([{ name: 'tu_vung', rows }]);
}

export async function previewPastedTuVung(
	text: string,
	setName?: string,
	userId?: string,
	policy: WordWritePolicy = {},
): Promise<UserWorkbookPreview> {
	const rows = parsePastedTuVung(text, setName);
	const buffer = await buildTuVungWorkbookBuffer(rows);
	return previewUserWorkbookBuffer(buffer, userId, policy);
}

export async function importPastedTuVung(
	userId: string,
	text: string,
	setName?: string,
	policy: WordWritePolicy = {},
): Promise<UserWorkbookPreview> {
	const rows = parsePastedTuVung(text, setName);
	const buffer = await buildTuVungWorkbookBuffer(rows);
	const { preview } = await importUserWorkbookBuffer(userId, buffer, {
		preserveSetTitle: true,
		setDescription: '',
		...policy,
	});
	return preview;
}

function appendSetCapacityErrors(
	preview: UserWorkbookPreview,
	setTitle: string,
	existingRawTerms: string[],
	incomingSimplified: string[],
): UserWorkbookPreview {
	const existingTerms = new Set(
		existingRawTerms.map((t) => normalizeTerm(t)).filter(Boolean),
	);
	const newTerms = new Set<string>();
	for (const term of incomingSimplified) {
		const normalized = normalizeTerm(term);
		if (!normalized) continue;
		if (existingTerms.has(normalized) || newTerms.has(normalized)) continue;
		newTerms.add(normalized);
	}
	const projected = existingTerms.size + newTerms.size;
	if (projected > MAX_CN_TERMS_PER_SET) {
		return {
			...preview,
			errors: [
				...preview.errors,
				`Bộ "${setTitle}" sẽ vượt ${MAX_CN_TERMS_PER_SET} từ (hiện ${existingTerms.size}, thêm ${newTerms.size})`,
			],
		};
	}
	return preview;
}

export async function previewTuVungIntoSet(
	userId: string,
	setId: string,
	text: string,
	policy: WordWritePolicy = {},
): Promise<UserWorkbookPreview | null> {
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: { items: { select: { rawTerm: true } } },
	});
	if (!set) return null;

	const preview = await previewPastedTuVung(text, set.title, userId, policy);
	const pastedRows = parsePastedTuVung(text, set.title);
	const incomingSimplified = pastedRows
		.map((row) => getField(row as Row, 'simplified'))
		.filter(Boolean);

	return appendSetCapacityErrors(
		preview,
		set.title,
		set.items.map((item) => item.rawTerm),
		incomingSimplified,
	);
}

export async function importTuVungIntoSet(
	userId: string,
	setId: string,
	text: string,
	policy: WordWritePolicy = {},
): Promise<{ preview: UserWorkbookPreview; addedCount: number } | null> {
	const canCreateWords = policy.canCreateWords === true;
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: { items: { select: { rawTerm: true } } },
	});
	if (!set) return null;

	const preview = await previewTuVungIntoSet(userId, setId, text, policy);
	if (!preview || preview.errors.length) {
		return preview ? { preview, addedCount: 0 } : null;
	}

	const rows = sanitizeSheetRows(parsePastedTuVung(text, set.title) as Row[]);
	const parsedRows = filterValidTuVungRows(parseTuVungRows(rows), canCreateWords);
	const existingTerms = new Set(
		set.items.map((item) => normalizeTerm(item.rawTerm)).filter(Boolean),
	);
	const newWordIds: string[] = [];
	let addedCount = 0;

	await prisma.$transaction(async (tx) => {
		const wordIdBySimplified = await upsertTuVungWordsAndExamples(
			tx,
			parsedRows,
			canCreateWords ? { kind: 'admin' } : { kind: 'learner' },
		);
		const seenTerms = new Set(existingTerms);

		for (const row of parsedRows) {
			if (seenTerms.size >= MAX_CN_TERMS_PER_SET) break;
			const term = normalizeTerm(row.simplified);
			if (!term || seenTerms.has(term)) continue;
			const wordId = wordIdBySimplified.get(row.simplified);
			if (!wordId) continue;

			await tx.cnWordSetItem.create({
				data: {
					setId,
					rawTerm: row.simplified,
					wordId,
				},
			});
			seenTerms.add(term);
			newWordIds.push(wordId);
			addedCount++;
		}

		await tx.cnWordSet.update({
			where: { id: setId },
			data: { updatedAt: new Date() },
		});
	});

	await enrollNewWordsForActiveFollowers(setId, newWordIds);

	return { preview, addedCount };
}
