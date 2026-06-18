import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { buildReviewQuestions } from '@/services/chinese/cnPracticeService';
import { countDueToday } from '@/services/chinese/cnSrsService';
import { CN_REVIEW_PREFETCH_SIZE } from '@/config/constants';

export const GET = withAuth(async (request, user) => {
	const limit = Number(request.nextUrl.searchParams.get('limit') ?? CN_REVIEW_PREFETCH_SIZE);
	const excludeRaw = request.nextUrl.searchParams.get('excludeIds') ?? '';
	const excludeQuestionIds = excludeRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const [dueToday, questions] = await Promise.all([
		countDueToday(user.id),
		buildReviewQuestions(user.id, limit, excludeQuestionIds),
	]);
	return apiSuccess({ dueToday, questions, total: questions.length });
});
