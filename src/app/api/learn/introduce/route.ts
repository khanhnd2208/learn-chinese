import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { validateJsonContentLength } from '@/lib/apiValidation';
import {
	CN_LEARN_BATCH_SIZE,
	RATE_LIMIT_SUBMIT_PER_MIN,
	RATE_LIMIT_WINDOW_MS,
} from '@/config/constants';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { markIntroduced } from '@/services/chinese/cnLearnService';

function validateWordIds(value: unknown): value is string[] {
	return Array.isArray(value)
		&& value.length >= 1
		&& value.length <= CN_LEARN_BATCH_SIZE
		&& value.every((id) => typeof id === 'string' && id.length > 0);
}

export const POST = withAuth(async (request, user) => {
	const contentLengthError = validateJsonContentLength(request.headers);
	if (contentLengthError) return apiError(contentLengthError, 400);

	const limit = checkRateLimit(rateLimitKey(user.id, 'learn/introduce'), {
		limit: RATE_LIMIT_SUBMIT_PER_MIN,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.allowed) {
		return apiError('Quá nhiều yêu cầu — thử lại sau', 429);
	}

	const body = await request.json() as { wordIds?: unknown };
	if (!validateWordIds(body.wordIds)) {
		return apiError(`wordIds phải là 1–${CN_LEARN_BATCH_SIZE} chuỗi`, 400);
	}

	const result = await markIntroduced(user.id, body.wordIds);
	return apiSuccess(result);
});
