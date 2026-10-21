import { NextResponse } from 'next/server';
import { withAuth, apiError } from '@/lib/apiUtils';
import { englishAreaOpenForRole } from '@/lib/english/access';
import { readEnglishAudio } from '@/services/english/enAudioService';

export const GET = withAuth(async (request, user) => {
	if (!englishAreaOpenForRole(user.role)) return apiError('Phần tiếng Anh chưa được mở', 403);
	const params = request.nextUrl.searchParams;
	const file = await readEnglishAudio({
		questionId: params.get('questionId'),
		senseId: params.get('senseId'),
		exampleId: params.get('exampleId'),
		patternExampleId: params.get('patternExampleId'),
	});
	return new NextResponse(new Uint8Array(file.bytes), {
		headers: {
			'Content-Type': file.type,
			'Cache-Control': 'private, max-age=3600',
		},
	});
});
