import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	activateSetInSrs,
	deactivateSetFromSrs,
	previewDeactivateSet,
} from '@/services/chinese/cnSrsEnrollmentService';
import { getUserSet } from '@/services/chinese/cnSetService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const { searchParams } = new URL(request.url);
	if (searchParams.get('preview') !== 'deactivate') {
		return apiError('preview không hợp lệ', 400);
	}
	const set = await getUserSet(user.id, id);
	if (!set) return apiError('Set not found', 404);
	const preview = await previewDeactivateSet(user.id, id);
	return apiSuccess(preview);
});

export const PATCH = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = await request.json() as { active?: boolean };
	if (typeof body.active !== 'boolean') {
		return apiError('Cần active: boolean', 400);
	}

	const set = await getUserSet(user.id, id);
	if (!set) return apiError('Set not found', 404);

	if (body.active) {
		await activateSetInSrs(user.id, id);
	} else {
		const { purgedWordCount } = await deactivateSetFromSrs(user.id, id);
		const updated = await getUserSet(user.id, id);
		return apiSuccess({ srsActive: false, purgedWordCount, set: updated });
	}

	const updated = await getUserSet(user.id, id);
	return apiSuccess({ srsActive: true, set: updated });
});
