import {
	buildUserSetSampleWorkbook,
	listUserSetSamples,
} from '@/lib/chinese/userSetSampleWorkbook';
import { arraysFromExcelSheet, readExcelWorkbook, rowsFromExcelSheet } from '@/lib/excelWorkbook';
import { VI_DU_COLUMN_KEYS } from '@/lib/chinese/parseFillExample';

const REQUIRED_COLUMNS = [
	'bo_tu',
	'simplified',
	'pinyin',
	'meaning_vi',
	'han_viet',
	'part_of_speech',
	'ghi_chu',
	...VI_DU_COLUMN_KEYS,
];

async function main() {
	const samples = listUserSetSamples();
	let failed = false;

	for (const meta of samples) {
		const buffer = await buildUserSetSampleWorkbook(meta.id);
		const wb = await readExcelWorkbook(buffer);

		console.log(`Sample workbook OK: ${meta.id}`);
		console.log(`  file: assets/sample/${meta.filename}`);
		console.log(`  api:  GET /api/sets/sample?set=${meta.id}`);
		console.log(`  title: ${meta.title}`);
		console.log(`  terms: ${meta.terms.length}`);
		console.log(`  first/last: ${meta.terms[0]} … ${meta.terms.at(-1)}`);
		console.log(`  sheets: ${wb.sheetNames.join(', ')}`);

		const guide = arraysFromExcelSheet(wb, 'huong_dan');
		if (!guide.some((row) => String(row[0]).includes('CÂU VÍ DỤ'))) {
			console.error(`FAIL [${meta.id}]: huong_dan missing fill-example guidance`);
			failed = true;
		}

		const rows = rowsFromExcelSheet(wb, 'tu_vung') as Record<string, string>[];
		if (rows.length < 18 || rows.length > 22) {
			console.error(`FAIL [${meta.id}]: expected ~20 rows, got ${rows.length}`);
			failed = true;
		}

		const columns = Object.keys(rows[0] ?? {}).sort();
		if (columns.join(',') !== [...REQUIRED_COLUMNS].sort().join(',')) {
			console.error(`FAIL [${meta.id}]: unexpected columns: ${columns.join(', ')}`);
			failed = true;
		}

		for (const row of rows) {
			const filled = VI_DU_COLUMN_KEYS.filter((k) => String(row[k] ?? '').trim()).length;
			if (filled < 5) {
				console.error(`FAIL [${meta.id}]: ${row.simplified} has only ${filled}/5 vi_du examples`);
				failed = true;
			}
		}
	}

	if (failed) process.exit(1);
	console.log(`\nAll ${samples.length} sample workbooks verified.`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
