import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { MAX_CN_TERMS_PER_SET, MAX_IMPORT_ROWS } from '@/config/constants';
import { normalizeTerm } from '@/lib/chinese/hanziUtils';
import type { CnErrorType, CnQuestionType, CnWordProgressState } from '@/types/chinese';

type Row = Record<string, unknown>;

const VALID_SET_SOURCES = new Set(['manual', 'hsk', 'textbook']);
const VALID_PROGRESS_STATES = new Set<CnWordProgressState>([
	'new', 'learning', 'weak', 'familiar', 'strong', 'mastered',
]);
const VALID_QUESTION_TYPES = new Set<CnQuestionType>([
	'hanzi_to_meaning', 'meaning_to_hanzi', 'pinyin_to_hanzi',
	'audio_to_hanzi', 'audio_to_meaning', 'audio_to_pinyin',
	'fill_sentence', 'sentence_order', 'radical_pick', 'char_components', 'similar_char', 'translate_sentence',
]);
const VALID_ERROR_TYPES = new Set<CnErrorType>([
	'sai_nghia', 'sai_pinyin', 'sai_thanh_dieu', 'nghe_khong_ra',
	'nham_chu', 'quen_hanzi', 'sai_mau_cau', 'sai_vi_tri', 'qua_han',
]);

function asString(value: unknown): string {
	if (value === null || value === undefined) return '';
	return String(value).trim();
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
		char_correct: p.charCorrect,
		char_total: p.charTotal,
		meaning_due_at: p.meaningDueAt?.toISOString() ?? '',
		meaning_interval_idx: p.meaningIntervalIdx,
		listening_due_at: p.listeningDueAt?.toISOString() ?? '',
		listening_interval_idx: p.listeningIntervalIdx,
		pinyin_due_at: p.pinyinDueAt?.toISOString() ?? '',
		pinyin_interval_idx: p.pinyinIntervalIdx,
		sentence_due_at: p.sentenceDueAt?.toISOString() ?? '',
		sentence_interval_idx: p.sentenceIntervalIdx,
		hanzi_due_at: p.hanziDueAt?.toISOString() ?? '',
		hanzi_interval_idx: p.hanziIntervalIdx,
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
	errors: string[];
	warnings: string[];
}

export async function previewUserWorkbook(file: File): Promise<UserWorkbookPreview> {
	const buffer = Buffer.from(await file.arrayBuffer());
	const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
	const errors: string[] = [];
	const warnings: string[] = [];
	const sets = sanitizeSheetRows(rowsFromSheet(workbook, 'sets'));
	const items = sanitizeSheetRows(rowsFromSheet(workbook, 'set_items'));
	const progress = sanitizeSheetRows(rowsFromSheet(workbook, 'progress'));
	const logs = sanitizeSheetRows(rowsFromSheet(workbook, 'answer_logs'));

	if (!sets.length) errors.push('Thiếu sheet sets hoặc không có dòng hợp lệ');
	if (!items.length) warnings.push('Sheet set_items trống — import sẽ chỉ tạo metadata bộ từ');

	for (const [i, row] of sets.entries()) {
		if (!asString(row.set_key)) errors.push(`sets dòng ${i + 2}: thiếu set_key`);
		if (!asString(row.title)) errors.push(`sets dòng ${i + 2}: thiếu title`);
		const source = asString(row.source) || 'manual';
		if (!VALID_SET_SOURCES.has(source)) errors.push(`sets dòng ${i + 2}: source không hợp lệ`);
	}

	const setKeys = new Set(sets.map((r) => asString(r.set_key)).filter(Boolean));
	for (const [i, row] of items.entries()) {
		if (!setKeys.has(asString(row.set_key))) errors.push(`set_items dòng ${i + 2}: set_key không tồn tại trong sheet sets`);
		if (!asString(row.raw_term)) errors.push(`set_items dòng ${i + 2}: thiếu raw_term`);
	}

	for (const [i, row] of progress.entries()) {
		const state = asString(row.state) as CnWordProgressState;
		if (!asString(row.word_simplified)) errors.push(`progress dòng ${i + 2}: thiếu word_simplified`);
		if (!VALID_PROGRESS_STATES.has(state)) errors.push(`progress dòng ${i + 2}: state không hợp lệ`);
		for (const pair of [
			['meaning_correct', 'meaning_total'],
			['listening_correct', 'listening_total'],
			['pinyin_correct', 'pinyin_total'],
			['sentence_correct', 'sentence_total'],
			['char_correct', 'char_total'],
		] as const) {
			const correct = asInt(row[pair[0]]);
			const total = asInt(row[pair[1]]);
			if (correct < 0 || total < 0 || correct > total) {
				errors.push(`progress dòng ${i + 2}: ${pair[0]} phải nằm trong khoảng 0..${pair[1]}`);
			}
		}
	}

	for (const [i, row] of logs.entries()) {
		const questionType = asString(row.question_type) as CnQuestionType;
		const errorType = asString(row.error_type) as CnErrorType;
		const correct = ['true', '1', 'yes'].includes(asString(row.correct).toLowerCase()) || row.correct === true;
		if (!asString(row.word_simplified)) errors.push(`answer_logs dòng ${i + 2}: thiếu word_simplified`);
		if (!VALID_QUESTION_TYPES.has(questionType)) errors.push(`answer_logs dòng ${i + 2}: question_type không hợp lệ`);
		if (errorType && !VALID_ERROR_TYPES.has(errorType)) errors.push(`answer_logs dòng ${i + 2}: error_type không hợp lệ`);
		if (correct && errorType) warnings.push(`answer_logs dòng ${i + 2}: correct=true nên error_type sẽ bị bỏ qua`);
	}

	return {
		sets: sets.length,
		items: items.length,
		progress: progress.length,
		answerLogs: logs.length,
		errors,
		warnings,
	};
}

export async function importUserWorkbook(userId: string, file: File, restoreProgress: boolean): Promise<UserWorkbookPreview> {
	const preview = await previewUserWorkbook(file);
	if (preview.errors.length) return preview;

	const buffer = Buffer.from(await file.arrayBuffer());
	const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
	const setRows = sanitizeSheetRows(rowsFromSheet(workbook, 'sets'));
	const itemRows = sanitizeSheetRows(rowsFromSheet(workbook, 'set_items'));
	const progressRows = sanitizeSheetRows(rowsFromSheet(workbook, 'progress'));
	const logRows = sanitizeSheetRows(rowsFromSheet(workbook, 'answer_logs'));

	await prisma.$transaction(async (tx) => {
		const setIdByKey = new Map<string, string>();
		for (const row of setRows) {
			const set = await tx.cnWordSet.create({
				data: {
					userId,
					title: asString(row.title),
					description: asString(row.description),
					source: (asString(row.source) || 'manual') as 'manual' | 'hsk' | 'textbook',
				},
			});
			setIdByKey.set(asString(row.set_key), set.id);
		}

		const itemCountBySet = new Map<string, number>();
		for (const row of itemRows) {
			const setId = setIdByKey.get(asString(row.set_key));
			if (!setId) continue;
			const currentCount = itemCountBySet.get(setId) ?? 0;
			if (currentCount >= MAX_CN_TERMS_PER_SET) continue;
			const rawTerm = normalizeTerm(asString(row.raw_term));
			if (!rawTerm) continue;
			const wordSimplified = asString(row.word_simplified) || rawTerm;
			const word = await tx.cnWord.findFirst({
				where: { simplified: wordSimplified, status: 'published' },
				select: { id: true },
			});
			await tx.cnWordSetItem.upsert({
				where: { setId_rawTerm: { setId, rawTerm } },
				create: { setId, rawTerm, wordId: word?.id ?? null },
				update: { wordId: word?.id ?? null },
			});
			itemCountBySet.set(setId, currentCount + 1);
		}

		if (restoreProgress) {
			for (const setId of setIdByKey.values()) {
				await tx.cnWordSet.update({ where: { id: setId }, data: { srsActive: true } });
			}
		}

		if (!restoreProgress) return;

		for (const row of progressRows) {
			const word = await tx.cnWord.findFirst({
				where: { simplified: asString(row.word_simplified), status: 'published' },
				select: { id: true },
			});
			if (!word) continue;
			await tx.cnWordProgress.upsert({
				where: { userId_wordId: { userId, wordId: word.id } },
				create: {
					userId,
					wordId: word.id,
					state: asString(row.state) as CnWordProgressState,
					dueAt: asDate(row.due_at) ?? new Date(),
					intervalIdx: asInt(row.interval_idx),
					lastReviewedAt: asDate(row.last_reviewed_at),
					meaningCorrect: asInt(row.meaning_correct),
					meaningTotal: asInt(row.meaning_total),
					listeningCorrect: asInt(row.listening_correct),
					listeningTotal: asInt(row.listening_total),
					pinyinCorrect: asInt(row.pinyin_correct),
					pinyinTotal: asInt(row.pinyin_total),
					sentenceCorrect: asInt(row.sentence_correct),
					sentenceTotal: asInt(row.sentence_total),
					charCorrect: asInt(row.char_correct),
					charTotal: asInt(row.char_total),
					meaningDueAt: asDate(row.meaning_due_at),
					meaningIntervalIdx: asInt(row.meaning_interval_idx),
					listeningDueAt: asDate(row.listening_due_at),
					listeningIntervalIdx: asInt(row.listening_interval_idx),
					pinyinDueAt: asDate(row.pinyin_due_at),
					pinyinIntervalIdx: asInt(row.pinyin_interval_idx),
					sentenceDueAt: asDate(row.sentence_due_at),
					sentenceIntervalIdx: asInt(row.sentence_interval_idx),
					hanziDueAt: asDate(row.hanzi_due_at),
					hanziIntervalIdx: asInt(row.hanzi_interval_idx),
				},
				update: {
					state: asString(row.state) as CnWordProgressState,
					dueAt: asDate(row.due_at) ?? new Date(),
					intervalIdx: asInt(row.interval_idx),
					lastReviewedAt: asDate(row.last_reviewed_at),
					meaningCorrect: asInt(row.meaning_correct),
					meaningTotal: asInt(row.meaning_total),
					listeningCorrect: asInt(row.listening_correct),
					listeningTotal: asInt(row.listening_total),
					pinyinCorrect: asInt(row.pinyin_correct),
					pinyinTotal: asInt(row.pinyin_total),
					sentenceCorrect: asInt(row.sentence_correct),
					sentenceTotal: asInt(row.sentence_total),
					charCorrect: asInt(row.char_correct),
					charTotal: asInt(row.char_total),
					meaningDueAt: asDate(row.meaning_due_at),
					meaningIntervalIdx: asInt(row.meaning_interval_idx),
					listeningDueAt: asDate(row.listening_due_at),
					listeningIntervalIdx: asInt(row.listening_interval_idx),
					pinyinDueAt: asDate(row.pinyin_due_at),
					pinyinIntervalIdx: asInt(row.pinyin_interval_idx),
					sentenceDueAt: asDate(row.sentence_due_at),
					sentenceIntervalIdx: asInt(row.sentence_interval_idx),
					hanziDueAt: asDate(row.hanzi_due_at),
					hanziIntervalIdx: asInt(row.hanzi_interval_idx),
				},
			});
		}

		for (const row of logRows) {
			const word = await tx.cnWord.findFirst({
				where: { simplified: asString(row.word_simplified), status: 'published' },
				select: { id: true },
			});
			if (!word) continue;
			const correct = ['true', '1', 'yes'].includes(asString(row.correct).toLowerCase()) || row.correct === true;
			await tx.cnAnswerLog.create({
				data: {
					userId,
					wordId: word.id,
					questionType: asString(row.question_type) as CnQuestionType,
					errorType: correct ? null : (asString(row.error_type) as CnErrorType || null),
					correct,
					createdAt: asDate(row.created_at) ?? new Date(),
				},
			});
		}
	});

	return preview;
}
