import * as XLSX from 'xlsx';
import {
	buildUserSetSampleWorkbook,
	listUserSetSamples,
} from '@/lib/chinese/userSetSampleWorkbook';

const REQUIRED_COLUMNS = [
	'bo_tu',
	'simplified',
	'pinyin',
	'meaning_vi',
	'han_viet',
	'part_of_speech',
	'ghi_chu',
];

function main() {
	const samples = listUserSetSamples();
	let failed = false;

	for (const meta of samples) {
		const buffer = buildUserSetSampleWorkbook(meta.id);
		const wb = XLSX.read(buffer, { type: 'buffer' });

		console.log(`Sample workbook OK: ${meta.id}`);
		console.log(`  file: assets/sample/${meta.filename}`);
		console.log(`  api:  GET /api/sets/sample?set=${meta.id}`);
		console.log(`  title: ${meta.title}`);
		console.log(`  terms: ${meta.terms.length}`);
		console.log(`  first/last: ${meta.terms[0]} … ${meta.terms.at(-1)}`);
		console.log(`  sheets: ${wb.SheetNames.join(', ')}`);

		const guide = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.huong_dan, { header: 1 });
		const legacyHint = guide.some((row) => String(row[0]).includes('câu ví dụ'));
		if (legacyHint) {
			console.error(`FAIL [${meta.id}]: huong_dan still mentions legacy example sentences`);
			failed = true;
		}

		const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets.tu_vung);
		if (rows.length < 18 || rows.length > 22) {
			console.error(`FAIL [${meta.id}]: expected ~20 rows, got ${rows.length}`);
			failed = true;
		}

		const columns = Object.keys(rows[0] ?? {}).sort();
		if (columns.join(',') !== [...REQUIRED_COLUMNS].sort().join(',')) {
			console.error(`FAIL [${meta.id}]: unexpected columns: ${columns.join(', ')}`);
			failed = true;
		}
	}

	if (failed) process.exit(1);
	console.log(`\nAll ${samples.length} sample workbooks verified.`);
}

main();
