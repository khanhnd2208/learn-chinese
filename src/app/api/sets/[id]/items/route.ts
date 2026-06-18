import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { addTermsToSet, moveItemToSet, removeItemFromSet } from '@/services/chinese/cnSetService';

type Ctx = { params: Promise<{ id: string }> };

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
	const ok = await removeItemFromSet(user.id, id, body.itemId);
	if (!ok) return apiError('Item not found', 404);
	return apiSuccess({ ok: true });
});
