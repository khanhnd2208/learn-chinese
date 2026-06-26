import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { listSharedSets } from '@/services/chinese/cnSetService';

export const GET = withAuth(async () => {
	const sets = await listSharedSets();
	return apiSuccess({ sets });
});
