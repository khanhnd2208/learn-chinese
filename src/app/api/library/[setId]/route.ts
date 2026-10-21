import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	enrollInSet,
	setEnrollmentSrs,
	unenrollFromSet,
} from '@/services/chinese/cnEnrollmentService';

type Ctx = { params: Promise<{ setId: string }> };

export const POST = withAuth(async (_request, user, ctx) => {
	const { setId } = await (ctx as Ctx).params;
	const result = await enrollInSet(user.id, setId);
	return apiSuccess(result, 201);
});

/** Unfollow. Word progress is kept. */
export const DELETE = withAuth(async (_request, user, ctx) => {
	const { setId } = await (ctx as Ctx).params;
	const result = await unenrollFromSet(user.id, setId);
	return apiSuccess(result);
});

export const PATCH = withAuth(async (request, user, ctx) => {
	const { setId } = await (ctx as Ctx).params;
	const body = await request.json() as { srsActive?: boolean };
	if (typeof body.srsActive !== 'boolean') {
		return apiError('Cần srsActive: boolean', 400);
	}
	const result = await setEnrollmentSrs(user.id, setId, body.srsActive);
	return apiSuccess(result);
});
