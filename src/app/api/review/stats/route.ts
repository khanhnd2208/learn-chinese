import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getReviewStats } from '@/services/chinese/cnReviewStatsService';

export const GET = withAuth(async (_request, user) => {
	const stats = await getReviewStats(user.id);
	return apiSuccess({ stats });
});
