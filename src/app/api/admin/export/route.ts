import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/apiUtils';
import { buildContentExportWorkbook } from '@/services/chinese/cnExcelService';

export const GET = withAdmin(async () => {
	const buffer = await buildContentExportWorkbook();
	return new NextResponse(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="learn-chinese-content.xlsx"',
			'Cache-Control': 'no-store',
		},
	});
});
