import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { buildInfernoSession } from '@/services/chinese/cnInfernoService';
import { CN_INFERNO_PREFETCH_SIZE } from '@/config/constants';

export const GET = withAuth(async (request, user) => {
	const limit = Number(request.nextUrl.searchParams.get('limit') ?? CN_INFERNO_PREFETCH_SIZE);
	const recentRaw = request.nextUrl.searchParams.get('recentWordIds') ?? '';
	const recentWordIds = recentRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)
		.slice(0, 20);

	const result = await buildInfernoSession(user.id, limit, recentWordIds);
	return apiSuccess({
		questions: result.questions,
		totalEnrolled: result.totalEnrolled,
		masteredCount: result.masteredCount,
		masteryByWordId: result.masteryByWordId,
		eligiblePairs: result.eligiblePairs,
		total: result.questions.length,
	});
});
