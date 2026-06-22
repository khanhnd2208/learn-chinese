import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { dismissUserMessage } from '@/services/chinese/cnUserMessageService';

export const POST = withAuth(async (_req, user, ctx) => {
	const id = (await ctx?.params)?.id as string | undefined;
	if (!id) return apiError('Missing id', 400);

	const ok = await dismissUserMessage(user.id, id);
	if (!ok) return apiError('Tin nhắn không tồn tại', 404);

	return apiSuccess({ dismissed: true });
});
