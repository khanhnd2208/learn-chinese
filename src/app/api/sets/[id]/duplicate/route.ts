import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { duplicateUserSet } from '@/services/chinese/cnSetService';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAdmin(async (_req, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const set = await duplicateUserSet(user.id, id);
	if (!set) return apiError('Set not found', 404);
	return apiSuccess({ set }, 201);
});
