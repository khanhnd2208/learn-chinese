import { withAdmin, withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { getWordCard, updateWordFields } from '@/services/chinese/cnContentService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, _user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const word = await getWordCard(id);
	if (!word) return apiError('Word not found', 404);
	return apiSuccess({ word });
});

export const PATCH = withAdmin(async (request, _user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const body = await request.json() as {
		pinyin?: string;
		meaningVi?: string;
		hanViet?: string;
		partOfSpeech?: string;
		ghiChu?: string;
		mnemonicVi?: string;
	};

	const word = await updateWordFields(id, body);
	if (!word) return apiError('Không sửa được từ — không tìm thấy từ', 404);
	return apiSuccess({ word });
});
