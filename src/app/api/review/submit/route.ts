import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { validatePracticeSubmitItems } from '@/lib/apiValidation';
import {
	RATE_LIMIT_SUBMIT_PER_MIN,
	RATE_LIMIT_WINDOW_MS,
} from '@/config/constants';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { submitReviewResults } from '@/services/chinese/cnSrsService';
import { summarizeSession } from '@/services/chinese/cnPracticeService';

export const POST = withAuth(async (request, user) => {
	const limit = checkRateLimit(rateLimitKey(user.id, 'review/submit'), {
		limit: RATE_LIMIT_SUBMIT_PER_MIN,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.allowed) {
		return apiError('Quá nhiều yêu cầu — thử lại sau', 429);
	}

	const body = await request.json() as { items?: unknown };
	if (!validatePracticeSubmitItems(body.items)) {
		return apiError('items không hợp lệ (cần wordId, questionType, correct; tối đa 200 mục)', 400);
	}

	const { updated } = await submitReviewResults(user.id, body.items);
	const summary = summarizeSession(body.items);
	return apiSuccess({ updated, summary });
});
