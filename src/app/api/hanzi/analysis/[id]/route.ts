import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { getHanziAiAnalysisById } from '@/services/chinese/hanziAi/hanziAnalysisService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_request, user, context) => {
	const limit = checkRateLimit(rateLimitKey(user.id, 'hanzi-ai-poll'), { limit: 30, windowMs: 60_000 });
	if (!limit.allowed) return apiError('Quá nhiều yêu cầu kiểm tra trạng thái', 429, 'HANZI_POLL_RATE_LIMITED');
	const { id } = await (context as Ctx).params;
	const result = await getHanziAiAnalysisById(id);
	if (!result) return apiError('Không tìm thấy phân tích', 404, 'HANZI_ANALYSIS_NOT_FOUND');
	const response = apiSuccess(result, result.status === 'generating' ? 202 : 200);
	if (result.status === 'generating') response.headers.set('Retry-After', '2');
	return response;
});

