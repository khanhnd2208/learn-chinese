import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import {
	buildUserSetSampleWorkbook,
	resolveSampleSetId,
} from '@/lib/chinese/userSetSampleWorkbook';
import { getHsk1SampleSet } from '@/lib/chinese/hsk1SampleSets';

export const GET = withAuth(async (req) => {
	const setId = resolveSampleSetId(req.nextUrl.searchParams.get('set'));
	const sample = getHsk1SampleSet(setId);
	const buffer = buildUserSetSampleWorkbook(setId);
	return new NextResponse(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${sample.filename}"`,
			'Cache-Control': 'no-store',
		},
	});
});
