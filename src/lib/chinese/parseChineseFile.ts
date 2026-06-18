/* ════════════════════════════════════════════════════════════════════════
   parseChineseFile.ts — Parse CSV/XLSX for Chinese content import
   ════════════════════════════════════════════════════════════════════════ */
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { MAX_IMPORT_ROWS } from '@/config/constants';
import { AppError } from '@/lib/appError';

export interface CnImportWordRow {
	simplified: string;
	pinyin: string;
	hanViet: string;
	meaningVi: string;
	partOfSpeech: string;
	mnemonicVi: string;
	hskLevel: number | null;
	exampleHanzi: string;
	examplePinyin: string;
	exampleMeaningVi: string;
	exampleSentences: string;
	patternTemplate: string;
	patternSamples: string;
	chars: string;
	status: 'draft' | 'published';
}

export interface CnImportHanziRow {
	char: string;
	pinyin: string;
	hanViet: string;
	meaningVi: string;
	components: string[];
	radical: string;
	mnemonicVi: string;
	similarGroupKey: string;
	status: 'draft' | 'published';
}

export interface CnImportRowError {
	row: number;
	missing: string[];
	message?: string;
}

export interface CnImportPreview {
	words: CnImportWordRow[];
	hanzi: CnImportHanziRow[];
	errors: CnImportRowError[];
	warnings: string[];
}

function parseComponents(val: string | undefined): string[] {
	if (!val) return [];
	return val.split(/[|,]/).map((s) => s.trim()).filter(Boolean);
}

function parseStatus(val: string | undefined): 'draft' | 'published' {
	return val?.trim().toLowerCase() === 'published' ? 'published' : 'draft';
}

function parseExampleSentences(raw: string): Array<{ hanzi: string; pinyin: string; meaningVi: string }> {
	if (!raw.trim()) return [];
	return raw.split('||').map((part) => {
		const [hanzi = '', pinyin = '', meaningVi = ''] = part.split('|').map((s) => s.trim());
		return { hanzi, pinyin, meaningVi };
	}).filter((s) => s.hanzi);
}

function mapWordRow(r: Record<string, string>, rowNum: number): { row?: CnImportWordRow; error?: CnImportRowError } {
	const simplified = (r.simplified ?? r.word ?? r.term ?? '').trim();
	const pinyin = (r.pinyin ?? '').trim();
	const meaningVi = (r.meaning_vi ?? r.meaningVi ?? r.definition ?? '').trim();
	const missing: string[] = [];
	if (!simplified) missing.push('simplified');
	if (!pinyin) missing.push('pinyin');
	if (!meaningVi) missing.push('meaning_vi');
	if (missing.length) return { error: { row: rowNum, missing } };

	const hskRaw = (r.hsk_level ?? r.hskLevel ?? '').trim();
	const hskLevel = hskRaw ? Number(hskRaw) : null;

	return {
		row: {
			simplified,
			pinyin,
			hanViet: (r.han_viet ?? r.hanViet ?? '').trim(),
			meaningVi,
			partOfSpeech: (r.part_of_speech ?? r.partOfSpeech ?? '').trim(),
			mnemonicVi: (r.mnemonic_vi ?? r.mnemonicVi ?? '').trim(),
			hskLevel: Number.isFinite(hskLevel) ? hskLevel : null,
			exampleHanzi: (r.example_hanzi ?? r.exampleHanzi ?? '').trim(),
			examplePinyin: (r.example_pinyin ?? r.examplePinyin ?? '').trim(),
			exampleMeaningVi: (r.example_meaning_vi ?? r.exampleMeaningVi ?? '').trim(),
			exampleSentences: (r.example_sentences ?? r.exampleSentences ?? '').trim(),
			patternTemplate: (r.pattern_template ?? r.patternTemplate ?? '').trim(),
			patternSamples: (r.pattern_samples ?? r.patternSamples ?? '').trim(),
			chars: (r.chars ?? '').trim(),
			status: parseStatus(r.status),
		},
	};
}

function mapHanziRow(r: Record<string, string>, rowNum: number): { row?: CnImportHanziRow; error?: CnImportRowError } {
	const char = (r.char ?? r.hanzi ?? '').trim();
	const missing: string[] = [];
	if (!char) missing.push('char');
	if (missing.length) return { error: { row: rowNum, missing } };

	return {
		row: {
			char,
			pinyin: (r.pinyin ?? '').trim(),
			hanViet: (r.han_viet ?? r.hanViet ?? '').trim(),
			meaningVi: (r.meaning_vi ?? r.meaningVi ?? '').trim(),
			components: parseComponents(r.components),
			radical: (r.radical ?? '').trim(),
			mnemonicVi: (r.mnemonic_vi ?? r.mnemonicVi ?? '').trim(),
			similarGroupKey: (r.similar_group ?? r.similarGroupKey ?? '').trim(),
			status: parseStatus(r.status),
		},
	};
}

async function rowsFromFile(file: File, type: 'words' | 'hanzi'): Promise<Record<string, string>[]> {
	const name = file.name.toLowerCase();
	const buffer = Buffer.from(await file.arrayBuffer());

	if (name.endsWith('.csv')) {
		const text = buffer.toString('utf-8');
		return parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
	}

	if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
		const wb = XLSX.read(buffer, { type: 'buffer' });
		const preferredSheet = type === 'hanzi' ? 'hanzi' : 'words';
		const sheetName = wb.SheetNames.includes(preferredSheet) ? preferredSheet : wb.SheetNames[0];
		const sheet = wb.Sheets[sheetName];
		return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
	}

	throw new AppError('Unsupported file type. Use CSV or XLSX.', 400);
}

export async function parseChineseImportFile(file: File, type: 'words' | 'hanzi'): Promise<CnImportPreview> {
	const rows = await rowsFromFile(file, type);
	if (rows.length > MAX_IMPORT_ROWS) {
		throw new AppError(`File có quá nhiều dòng (tối đa ${MAX_IMPORT_ROWS})`, 400);
	}
	const words: CnImportWordRow[] = [];
	const hanzi: CnImportHanziRow[] = [];
	const errors: CnImportRowError[] = [];
	const warnings: string[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < rows.length; i++) {
		const rowNum = i + 2;
		if (type === 'words') {
			const mapped = mapWordRow(rows[i], rowNum);
			if (mapped.error) {
				errors.push(mapped.error);
				continue;
			}
			if (seen.has(mapped.row!.simplified)) {
				warnings.push(`Dòng ${rowNum}: trùng từ "${mapped.row!.simplified}"`);
				continue;
			}
			seen.add(mapped.row!.simplified);
			words.push(mapped.row!);
		} else {
			const mapped = mapHanziRow(rows[i], rowNum);
			if (mapped.error) {
				errors.push(mapped.error);
				continue;
			}
			if (seen.has(mapped.row!.char)) {
				warnings.push(`Dòng ${rowNum}: trùng chữ "${mapped.row!.char}"`);
				continue;
			}
			seen.add(mapped.row!.char);
			hanzi.push(mapped.row!);
		}
	}

	return { words, hanzi, errors, warnings };
}
