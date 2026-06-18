import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getChineseDashboard } from '@/services/chinese/cnDashboardService';

export const GET = withAuth(async (_req, user) => {
	const dashboard = await getChineseDashboard(user.id);
	return apiSuccess({ dashboard });
});
