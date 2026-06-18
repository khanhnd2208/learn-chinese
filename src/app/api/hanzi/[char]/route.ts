import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { getHanziAnalysis } from '@/services/chinese/cnContentService';

type Ctx = { params: Promise<{ char: string }> };

export const GET = withAuth(async (request, _user, ctx) => {
	const { char: paramChar } = await (ctx as Ctx).params;
	const term = decodeURIComponent(paramChar);
	const termsParam = request.nextUrl.searchParams.get('terms');
	const terms = termsParam ? termsParam.split(',').map((t) => decodeURIComponent(t.trim())).filter(Boolean) : [term];

	if (terms.length > 15) return apiError('Tối đa 15 từ mỗi lần', 400);

	const analyses = await Promise.all(terms.map((t) => getHanziAnalysis(t)));
	return apiSuccess({ analyses, term: terms.length === 1 ? analyses[0] : null });
});
