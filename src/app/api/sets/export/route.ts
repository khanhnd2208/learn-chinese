import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import { buildUserDataExportWorkbook } from '@/services/chinese/cnExcelService';

export const GET = withAuth(async (_request, user) => {
	const buffer = await buildUserDataExportWorkbook(user.id);
	return new NextResponse(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="learn-chinese-user-data.xlsx"',
			'Cache-Control': 'no-store',
		},
	});
});
