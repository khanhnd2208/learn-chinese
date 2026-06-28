import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	parseBoundedIntParam,
	parseDelimitedListParam,
	CN_MAX_EXCLUDE_IDS,
} from '@/lib/apiValidation';
import { buildReviewQuestions } from '@/services/chinese/cnPracticeService';
import { countDueToday } from '@/services/chinese/cnSrsService';
import { CN_MAX_REVIEW_FETCH_LIMIT, CN_REVIEW_PREFETCH_SIZE } from '@/config/constants';

export const GET = withAuth(async (request, user) => {
	const limit = parseBoundedIntParam(request.nextUrl.searchParams.get('limit'), {
		defaultValue: CN_REVIEW_PREFETCH_SIZE,
		min: 1,
		max: CN_MAX_REVIEW_FETCH_LIMIT,
	});
	if (limit === null) return apiError(`limit phải là số nguyên 1–${CN_MAX_REVIEW_FETCH_LIMIT}`, 400);
	const excludeQuestionIds = parseDelimitedListParam(request.nextUrl.searchParams.get('excludeIds'));
	const excludeWordChannels = parseDelimitedListParam(request.nextUrl.searchParams.get('excludeWordChannels'));
	if (!excludeQuestionIds || !excludeWordChannels) {
		return apiError(`Danh sách exclude tối đa ${CN_MAX_EXCLUDE_IDS} mục`, 400);
	}

	const [dueToday, reviewResult] = await Promise.all([
		countDueToday(user.id),
		buildReviewQuestions(user.id, limit, excludeQuestionIds, excludeWordChannels),
	]);
	return apiSuccess({
		dueToday,
		questions: reviewResult.questions,
		total: reviewResult.questions.length,
		skippedUnpublished: reviewResult.skippedUnpublished,
	});
});
