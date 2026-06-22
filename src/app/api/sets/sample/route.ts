import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import {
	buildUserSetSampleWorkbook,
	USER_SET_SAMPLE_FILENAME,
} from '@/lib/chinese/userSetSampleWorkbook';

export const GET = withAuth(async () => {
	const buffer = buildUserSetSampleWorkbook();
	return new NextResponse(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${USER_SET_SAMPLE_FILENAME}"`,
			'Cache-Control': 'no-store',
		},
	});
});
