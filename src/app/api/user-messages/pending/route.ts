import { withAuth, apiSuccess } from '@/lib/apiUtils';
import { getPendingUserMessage } from '@/services/chinese/cnUserMessageService';

export const GET = withAuth(async (_req, user) => {
	const message = await getPendingUserMessage(user.id);
	return apiSuccess({ message });
});
