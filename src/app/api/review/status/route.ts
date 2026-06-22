import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getReviewStatus } from '@/services/chinese/cnReviewStatsService';

export const GET = withAuth(async (_request, user) => {
	const status = await getReviewStatus(user.id);
	return apiSuccess({ status });
});
