import { withAdmin, apiSuccess } from '@/lib/apiUtils';
import { getAdminPracticeAnalytics } from '@/services/chinese/cnAdminAnalyticsService';

export const GET = withAdmin(async () => {
	const analytics = await getAdminPracticeAnalytics();
	return apiSuccess({ analytics });
});
