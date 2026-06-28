import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { validateJsonContentLength, validatePracticeSubmitItems } from '@/lib/apiValidation';
import {
	RATE_LIMIT_SUBMIT_PER_MIN,
	RATE_LIMIT_WINDOW_MS,
} from '@/config/constants';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { submitInfernoResults } from '@/services/chinese/cnInfernoService';
import { summarizeSession } from '@/services/chinese/cnPracticeService';

export const POST = withAuth(async (request, user) => {
	const contentLengthError = validateJsonContentLength(request.headers);
	if (contentLengthError) return apiError(contentLengthError, 400);

	const limit = checkRateLimit(rateLimitKey(user.id, 'inferno/submit'), {
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

	const { updated, masteryDeltas } = await submitInfernoResults(user.id, body.items);
	const summary = summarizeSession(body.items);
	return apiSuccess({ updated, masteryDeltas, summary });
});
