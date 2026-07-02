import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getReviewBriefing } from '@/services/chinese/cnReviewStatsService';

export const GET = withAuth(async (_request, user) => {
	const briefing = await getReviewBriefing(user.id);
	return apiSuccess({ briefing });
});
