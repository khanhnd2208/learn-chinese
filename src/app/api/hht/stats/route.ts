import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getHhtGateStats } from '@/services/chinese/cnHhtService';

export const GET = withAuth(async (_request, user) => {
	const stats = await getHhtGateStats(user.id);
	return apiSuccess({ stats });
});
