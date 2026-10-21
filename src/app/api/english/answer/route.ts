import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { RATE_LIMIT_SUBMIT_PER_MIN, RATE_LIMIT_WINDOW_MS } from '@/config/constants';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { englishAreaOpenForRole } from '@/lib/english/access';
import { englishAnswerSchema } from '@/lib/english/schemas';
import { submitEnglishAnswer } from '@/services/english/enAnswerService';

export const POST = withAuth(async (request, user) => {
	if (!englishAreaOpenForRole(user.role)) return apiError('Phần tiếng Anh chưa được mở', 403);
	const limit = checkRateLimit(rateLimitKey(user.id, 'english/answer'), {
		limit: RATE_LIMIT_SUBMIT_PER_MIN,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.allowed) return apiError('Quá nhiều yêu cầu — thử lại sau', 429);
	const parsed = englishAnswerSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Câu trả lời không hợp lệ', 400);
	const result = await submitEnglishAnswer(user.id, parsed.data);
	return apiSuccess(result);
});
