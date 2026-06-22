import * as XLSX from 'xlsx';
import { buildUserSetSampleWorkbook, getUserSetSampleMeta } from '@/lib/chinese/userSetSampleWorkbook';
import { importUserWorkbook, previewUserWorkbook } from '@/services/chinese/cnExcelService';

const userId = process.argv[2] ?? 'debug-user';
const wordCount = Number(process.argv[3] ?? 31);

const wb = XLSX.read(buildUserSetSampleWorkbook(), { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets.tu_vung);
const sampleTitle = getUserSetSampleMeta().title;
const expanded: Record<string, string | number>[] = [];
let n = 0;
while (expanded.length < wordCount) {
	for (const r of rows) {
		if (expanded.length >= wordCount) break;
		expanded.push({
			...r,
			simplified: `${r.simplified}${n}`,
			bo_tu: sampleTitle,
			vi_du_1: `我是${r.simplified}${n}。`,
			vi_du_1_pinyin: 'Wǒ shì xuésheng.',
			vi_du_1_nghia: 'Tôi là học sinh.',
			vi_du_2: `他也是${r.simplified}${n}。`,
			vi_du_2_pinyin: 'Tā yě shì xuésheng.',
			vi_du_2_nghia: 'Anh ấy cũng là học sinh.',
			vi_du_3: `我们都是${r.simplified}${n}。`,
			vi_du_3_pinyin: 'Wǒmen dōu shì xuésheng.',
			vi_du_3_nghia: 'Chúng tôi đều là học sinh.',
		});
	}
	n++;
}

const out = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(out, XLSX.utils.json_to_sheet(expanded), 'tu_vung');
const buf = XLSX.write(out, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
const file = new File([new Uint8Array(buf)], 'debug-import.xlsx', {
	type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

async function main() {
	let targetUserId = userId;
	if (targetUserId === 'debug-user') {
		const { prisma } = await import('@/lib/prisma');
		const row = await prisma.cnWordSet.findFirst({ select: { userId: true } });
		if (!row?.userId) throw new Error('No userId found');
		targetUserId = row.userId;
		console.log('using userId', targetUserId);
	}

	const preview = await previewUserWorkbook(file, targetUserId);
	console.log('preview', { errors: preview.errors.length, valid: preview.validWords, examplesAuto: preview.examplesAuto });
	if (preview.errors.length) {
		console.log('errors', preview.errors);
		return;
	}
	const t0 = Date.now();
	const result = await importUserWorkbook(targetUserId, file, false);
	console.log('import ok', { valid: result.validWords, sets: result.setsCount ?? result.sets, ms: Date.now() - t0 });
}

main().catch((e: unknown) => {
	const err = e as Error;
	console.error('FAIL', err.message);
	console.error(err.stack?.split('\n').slice(0, 10).join('\n'));
	process.exit(1);
});
