import ExcelJS from 'exceljs';

export type ExcelRow = Record<string, unknown>;

export interface ExcelWorkbookData {
	sheetNames: string[];
	sheets: Record<string, {
		rows: ExcelRow[];
		arrays: unknown[][];
	}>;
}

export interface ExcelSheetInput {
	name: string;
	rows?: ExcelRow[];
	arrays?: unknown[][];
}

function normalizeCellValue(value: ExcelJS.CellValue): unknown {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value;
	if (typeof value !== 'object') return value;

	if ('result' in value && value.result !== undefined) return value.result ?? '';
	if ('text' in value && value.text !== undefined) return value.text ?? '';
	if ('richText' in value && Array.isArray(value.richText)) {
		return value.richText.map((part) => part.text).join('');
	}
	if ('hyperlink' in value && value.hyperlink !== undefined) return value.hyperlink ?? '';
	return String(value);
}

function isNonEmptyArrayRow(row: unknown[]): boolean {
	return row.some((value) => String(value ?? '').trim().length > 0);
}

function worksheetToArrays(worksheet: ExcelJS.Worksheet): unknown[][] {
	const rows: unknown[][] = [];
	worksheet.eachRow({ includeEmpty: false }, (row) => {
		const values = Array.isArray(row.values) ? row.values.slice(1) : [];
		const normalized = values.map((value) => normalizeCellValue(value as ExcelJS.CellValue));
		if (isNonEmptyArrayRow(normalized)) rows.push(normalized);
	});
	return rows;
}

function arraysToObjectRows(arrays: unknown[][]): ExcelRow[] {
	const [headerRow, ...dataRows] = arrays;
	if (!headerRow) return [];
	const headers = headerRow.map((value) => String(value ?? '').trim());
	return dataRows.map((row) => {
		const obj: ExcelRow = {};
		for (let i = 0; i < headers.length; i++) {
			const key = headers[i];
			if (!key) continue;
			obj[key] = row[i] ?? '';
		}
		return obj;
	});
}

export async function readExcelWorkbook(buffer: Buffer): Promise<ExcelWorkbookData> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer as never);

	const sheetNames: string[] = [];
	const sheets: ExcelWorkbookData['sheets'] = {};
	for (const worksheet of workbook.worksheets) {
		sheetNames.push(worksheet.name);
		const arrays = worksheetToArrays(worksheet);
		sheets[worksheet.name] = {
			arrays,
			rows: arraysToObjectRows(arrays),
		};
	}
	return { sheetNames, sheets };
}

function headersForRows(rows: ExcelRow[]): string[] {
	const seen = new Set<string>();
	const headers: string[] = [];
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (seen.has(key)) continue;
			seen.add(key);
			headers.push(key);
		}
	}
	return headers;
}

function addRowsSheet(workbook: ExcelJS.Workbook, name: string, rows: ExcelRow[]): void {
	const worksheet = workbook.addWorksheet(name);
	const headers = headersForRows(rows);
	if (!headers.length) return;
	worksheet.addRow(headers);
	for (const row of rows) {
		worksheet.addRow(headers.map((header) => row[header] ?? ''));
	}
}

function addArraySheet(workbook: ExcelJS.Workbook, name: string, arrays: unknown[][]): void {
	const worksheet = workbook.addWorksheet(name);
	for (const row of arrays) worksheet.addRow(row);
}

export async function buildExcelWorkbookBuffer(sheets: ExcelSheetInput[]): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	for (const sheet of sheets) {
		if (sheet.arrays) addArraySheet(workbook, sheet.name, sheet.arrays);
		else addRowsSheet(workbook, sheet.name, sheet.rows ?? []);
	}
	const output = await workbook.xlsx.writeBuffer();
	return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

export function rowsFromExcelSheet(workbook: ExcelWorkbookData, sheetName: string): ExcelRow[] {
	return workbook.sheets[sheetName]?.rows ?? [];
}

export function arraysFromExcelSheet(workbook: ExcelWorkbookData, sheetName: string): unknown[][] {
	return workbook.sheets[sheetName]?.arrays ?? [];
}

export function hasExcelSheet(workbook: ExcelWorkbookData, sheetName: string): boolean {
	return workbook.sheetNames.includes(sheetName);
}

export function excelSerialNumberToDate(value: number): Date | null {
	if (!Number.isFinite(value)) return null;
	const timestamp = Math.round((value - 25569) * 86_400_000);
	const date = new Date(timestamp);
	return Number.isNaN(date.getTime()) ? null : date;
}
