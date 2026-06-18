import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { getWordCard } from '@/services/chinese/cnContentService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, _user, ctx) => {
	const { id } = await (ctx as Ctx).params;
	const word = await getWordCard(id);
	if (!word) return apiError('Word not found', 404);
	return apiSuccess({ word });
});
