import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { addTermsToSet, moveItemToSet, removeItemFromSet } from '@/services/chinese/cnSetService';
import { previewRemoveWordFromSet } from '@/services/chinese/cnSrsEnrollmentService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const { searchParams } = new URL(request.url);
	if (searchParams.get('preview') !== 'remove') {
		return apiError('preview không hợp lệ', 400);
	}
	const wordId = searchParams.get('wordId');
	if (!wordId) return apiError('wordId is required', 400);

	const preview = await previewRemoveWordFromSet(user.id, id, wordId);
	return apiSuccess(preview);
});

export const POST = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = await request.json() as { terms?: string[] };
	if (!body.terms?.length) return apiError('terms is required', 400);
	const result = await addTermsToSet(user.id, id, body.terms);
	if (!result) return apiError('Set not found', 404);
	return apiSuccess(result);
});

export const PATCH = withAuth(async (request, user, ctx) => {
	const { id: fromSetId } = await (ctx as Ctx).params;
	const body = await request.json() as { itemId?: string; toSetId?: string };
	if (!body.itemId || !body.toSetId) return apiError('itemId and toSetId required', 400);
	const ok = await moveItemToSet(user.id, fromSetId, body.itemId, body.toSetId);
	if (!ok) return apiError('Move failed', 400);
	return apiSuccess({ ok: true });
});

export const DELETE = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = await request.json() as { itemId?: string };
	if (!body.itemId) return apiError('itemId is required', 400);
	const result = await removeItemFromSet(user.id, id, body.itemId);
	if (!result.ok) return apiError('Item not found', 404);
	return apiSuccess({ ok: true, purgedProgress: result.purgedProgress });
});
