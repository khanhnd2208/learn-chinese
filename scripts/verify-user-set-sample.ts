import * as XLSX from 'xlsx';
import {
	USER_SET_SAMPLE_FILENAME,
	buildUserSetSampleWorkbook,
	getUserSetSampleMeta,
} from '@/lib/chinese/userSetSampleWorkbook';

function main() {
	const meta = getUserSetSampleMeta();
	const buffer = buildUserSetSampleWorkbook();
	const wb = XLSX.read(buffer, { type: 'buffer' });

	console.log('Sample workbook OK');
	console.log(`  file: assets/sample/${USER_SET_SAMPLE_FILENAME}`);
	console.log(`  api:  GET /api/sets/sample → ${USER_SET_SAMPLE_FILENAME}`);
	console.log(`  title: ${meta.title}`);
	console.log(`  terms: ${meta.terms.length}`);
	console.log(`  first/last: ${meta.terms[0]} … ${meta.terms.at(-1)}`);
	console.log(`  sheets: ${wb.SheetNames.join(', ')}`);

	const guide = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.huong_dan, { header: 1 });
	const legacyHint = guide.some((row) => String(row[0]).includes('学生 — 3 câu ví dụ'));
	if (legacyHint) {
		console.error('FAIL: huong_dan still mentions legacy 4-row demo');
		process.exit(1);
	}
}

main();
