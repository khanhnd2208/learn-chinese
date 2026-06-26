import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { setSharedStatus } from '@/services/chinese/cnSetService';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAdmin(async (req, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = (await req.json()) as { shared?: boolean };
	if (typeof body.shared !== 'boolean') {
		return apiError('Thiếu trường shared (boolean)', 400);
	}

	const set = await setSharedStatus(user.id, id, body.shared);
	if (!set) return apiError('Bộ từ không tồn tại', 404);
	return apiSuccess({ set });
});
