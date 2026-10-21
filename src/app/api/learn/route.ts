import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getLearnQueue } from '@/services/chinese/cnLearnService';

export const GET = withAuth(async (_request, user) => {
	const queue = await getLearnQueue(user.id);
	return apiSuccess(queue);
});
