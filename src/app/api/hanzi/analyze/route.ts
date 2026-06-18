import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { generateHanziAiAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisService';

export const maxDuration = 90;

export const POST = withAuth(async (request, user) => {
	const body = await request.json() as { term?: unknown };
	if (typeof body.term !== 'string') {
		return apiError('term is required', 400, 'INVALID_HANZI_TERM');
	}
	const result = await generateHanziAiAnalysis(body.term, user);
	if (result.status === 'generating') {
		const response = apiSuccess(result.data, 202);
		response.headers.set('Retry-After', '2');
		return response;
	}
	return apiSuccess(result.data);
});

