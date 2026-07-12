import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { parseBoundedIntParam, parseDelimitedListParam } from '@/lib/apiValidation';
import { buildHhtSession } from '@/services/chinese/cnHhtService';
import { CN_HHT_PREFETCH_SIZE, CN_MAX_HHT_FETCH_LIMIT } from '@/config/constants';

export const GET = withAuth(async (request, user) => {
	const limit = parseBoundedIntParam(request.nextUrl.searchParams.get('limit'), {
		defaultValue: CN_HHT_PREFETCH_SIZE,
		min: 1,
		max: CN_MAX_HHT_FETCH_LIMIT,
	});
	if (limit === null) return apiError(`limit phải là số nguyên 1–${CN_MAX_HHT_FETCH_LIMIT}`, 400);
	const recentWordIds = parseDelimitedListParam(request.nextUrl.searchParams.get('recentWordIds'), {
		maxItems: 20,
	});
	if (!recentWordIds) return apiError('recentWordIds tối đa 20 mục', 400);

	const result = await buildHhtSession(user.id, limit, recentWordIds);
	return apiSuccess({
		questions: result.questions,
		totalEnrolled: result.totalEnrolled,
		activeSetCount: result.activeSetCount,
		eligibleWordCount: result.eligibleWordCount,
		total: result.questions.length,
	});
});
