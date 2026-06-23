import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	addTermsToSet,
	moveItemToSet,
	removeItemFromSet,
	removeItemsFromSet,
	resolveSetItemWithWordData,
} from '@/services/chinese/cnSetService';
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
	const body = await request.json() as {
		itemId?: string;
		toSetId?: string;
		wordFields?: {
			pinyin?: string;
			meaningVi?: string;
			hanViet?: string;
			partOfSpeech?: string;
			ghiChu?: string;
			mnemonicVi?: string;
		};
	};

	if (!body.itemId) return apiError('itemId is required', 400);

	if (body.wordFields) {
		if (!body.wordFields.pinyin?.trim() || !body.wordFields.meaningVi?.trim()) {
			return apiError('pinyin và meaningVi là bắt buộc', 400);
		}
		try {
			const set = await resolveSetItemWithWordData(user.id, fromSetId, body.itemId, {
				pinyin: body.wordFields.pinyin,
				meaningVi: body.wordFields.meaningVi,
				hanViet: body.wordFields.hanViet,
				partOfSpeech: body.wordFields.partOfSpeech,
				ghiChu: body.wordFields.ghiChu,
				mnemonicVi: body.wordFields.mnemonicVi,
			});
			if (!set) return apiError('Không bổ sung được dữ liệu từ', 404);
			return apiSuccess({ set });
		} catch (e) {
			return apiError(e instanceof Error ? e.message : 'Lỗi', 400);
		}
	}

	if (!body.toSetId) return apiError('toSetId or wordFields required', 400);
	const ok = await moveItemToSet(user.id, fromSetId, body.itemId, body.toSetId);
	if (!ok) return apiError('Move failed', 400);
	return apiSuccess({ ok: true });
});

export const DELETE = withAuth(async (request, user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = await request.json() as { itemId?: string; itemIds?: string[] };

	if (body.itemIds?.length) {
		const result = await removeItemsFromSet(user.id, id, body.itemIds);
		if (!result.ok) return apiError('Không xóa được mục nào', 404);
		return apiSuccess({
			ok: true,
			removedCount: result.removedCount,
			purgedProgressCount: result.purgedProgressCount,
		});
	}

	if (!body.itemId) return apiError('itemId or itemIds is required', 400);
	const result = await removeItemFromSet(user.id, id, body.itemId);
	if (!result.ok) return apiError('Item not found', 404);
	return apiSuccess({ ok: true, purgedProgress: result.purgedProgress });
});
