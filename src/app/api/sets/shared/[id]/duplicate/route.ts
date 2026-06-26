import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { duplicateSharedSet } from '@/services/chinese/cnSetService';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (_req, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const set = await duplicateSharedSet(user.id, id);
	if (!set) return apiError('Bộ từ chia sẻ không tồn tại', 404);
	return apiSuccess({ set }, 201);
});
