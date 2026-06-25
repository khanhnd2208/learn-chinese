import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getInfernoStats } from '@/services/chinese/cnInfernoService';

export const GET = withAuth(async (_request, user) => {
	const stats = await getInfernoStats(user.id);
	return apiSuccess({ stats });
});
