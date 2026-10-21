import { withAdmin, withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { deleteUserSet, getViewableSet, updateUserSet } from '@/services/chinese/cnSetService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const set = await getViewableSet(user.id, id);
	if (!set) return apiError('Set not found', 404);
	return apiSuccess({ set });
});

export const PATCH = withAdmin(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = await request.json() as {
		title?: string;
		description?: string;
		level?: number | null;
		sortOrder?: number;
	};
	if (body.level !== undefined && body.level !== null && (!Number.isInteger(body.level) || body.level < 1 || body.level > 9)) {
		return apiError('level phải từ 1 đến 9', 400);
	}
	if (body.sortOrder !== undefined && (!Number.isInteger(body.sortOrder) || body.sortOrder < 0)) {
		return apiError('sortOrder không hợp lệ', 400);
	}
	const set = await updateUserSet(user.id, id, body);
	if (!set) return apiError('Set not found', 404);
	return apiSuccess({ set });
});

/** Owner only. Learners use this to delete a legacy set they still own. */
export const DELETE = withAuth(async (_req, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const ok = await deleteUserSet(user.id, id);
	if (!ok) return apiError('Set not found', 404);
	return apiSuccess(null);
});
