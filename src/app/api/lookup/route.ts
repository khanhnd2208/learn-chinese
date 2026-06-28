import { lookupTerms, buildCoverageReport } from '@/services/chinese/cnContentService';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	MAX_CN_TERMS_PER_SET,
	RATE_LIMIT_LOOKUP_PER_MIN,
	RATE_LIMIT_WINDOW_MS,
} from '@/config/constants';
import { validateJsonContentLength } from '@/lib/apiValidation';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';

export const POST = withAuth(async (request, user) => {
	const contentLengthError = validateJsonContentLength(request.headers);
	if (contentLengthError) return apiError(contentLengthError, 400);

	const limit = checkRateLimit(rateLimitKey(user.id, 'lookup'), {
		limit: RATE_LIMIT_LOOKUP_PER_MIN,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.allowed) {
		return apiError('Quá nhiều yêu cầu tra cứu — thử lại sau', 429);
	}

	const body = await request.json() as { terms?: unknown };
	if (!Array.isArray(body.terms) || body.terms.length === 0 || body.terms.length > MAX_CN_TERMS_PER_SET) {
		return apiError(`terms is required (1–${MAX_CN_TERMS_PER_SET} từ)`, 400);
	}
	if (!body.terms.every((t) => typeof t === 'string' && t.trim().length > 0)) {
		return apiError('terms phải là mảng chuỗi không rỗng', 400);
	}

	const terms = body.terms.map((t) => (t as string).trim());
	const results = await lookupTerms(terms);
	return apiSuccess({ results, coverage: buildCoverageReport(results) });
});
