import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { deleteUserSet, getUserSet, updateUserSet } from '@/services/chinese/cnSetService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const set = await getUserSet(user.id, id);
	if (!set) return apiError('Set not found', 404);
	return apiSuccess({ set });
});

export const PATCH = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = await request.json() as { title?: string; description?: string };
	const set = await updateUserSet(user.id, id, body);
	if (!set) return apiError('Set not found', 404);
	return apiSuccess({ set });
});

export const DELETE = withAuth(async (_req, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const ok = await deleteUserSet(user.id, id);
	if (!ok) return apiError('Set not found', 404);
	return apiSuccess(null);
});
