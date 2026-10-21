import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/apiUtils';
import {
	buildDownloadSampleWorkbook,
	DOWNLOAD_SAMPLE_FILENAME,
} from '@/lib/chinese/buildSampleWorkbook';

export const GET = withAdmin(async () => {
	const buffer = await buildDownloadSampleWorkbook();
	return new NextResponse(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${DOWNLOAD_SAMPLE_FILENAME}"`,
			'Cache-Control': 'no-store',
		},
	});
});
