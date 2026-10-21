import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	activateSetInSrs,
	deactivateSetFromSrs,
	previewDeactivateSet,
	purgeSrsProgressForSet,
} from '@/services/chinese/cnSrsEnrollmentService';
import { getViewableSet } from '@/services/chinese/cnSetService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const { searchParams } = new URL(request.url);
	if (searchParams.get('preview') !== 'deactivate') {
		return apiError('preview không hợp lệ', 400);
	}
	const set = await getViewableSet(user.id, id);
	if (!set) return apiError('Set not found', 404);
	const preview = await previewDeactivateSet(user.id, id);
	return apiSuccess({
		...preview,
		/** Words that would lose SRS progress if user explicitly purges this set */
		purgeWordCount: preview.exclusiveWordCount,
	});
});

export const PATCH = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = await request.json() as { active?: boolean };
	if (typeof body.active !== 'boolean') {
		return apiError('Cần active: boolean', 400);
	}

	const set = await getViewableSet(user.id, id);
	if (!set) return apiError('Set not found', 404);

	if (body.active) {
		await activateSetInSrs(user.id, id);
	} else {
		await deactivateSetFromSrs(user.id, id);
	}

	const updated = await getViewableSet(user.id, id);
	return apiSuccess({ srsActive: body.active, set: updated });
});

/** Explicit purge of SRS progress for words exclusive to this set */
export const DELETE = withAuth(async (_request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const set = await getViewableSet(user.id, id);
	if (!set) return apiError('Set not found', 404);

	const { purgedWordCount } = await purgeSrsProgressForSet(user.id, id);
	const updated = await getViewableSet(user.id, id);
	return apiSuccess({ purgedWordCount, set: updated });
});
