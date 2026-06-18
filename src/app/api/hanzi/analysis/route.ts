import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getCachedHanziAiAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisService';

export const GET = withAuth(async (request, user) => {
	const limit = checkRateLimit(rateLimitKey(user.id, 'hanzi-ai-cache'), { limit: 60, windowMs: 60_000 });
	if (!limit.allowed) return apiError('Quá nhiều yêu cầu đọc kết quả', 429, 'HANZI_CACHE_RATE_LIMITED');
	const term = request.nextUrl.searchParams.get('term');
	if (!term) return apiError('term is required', 400, 'INVALID_HANZI_TERM');
	return apiSuccess({ analysis: await getCachedHanziAiAnalysis(term) });
});

