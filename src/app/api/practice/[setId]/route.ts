import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { buildPracticeSession } from '@/services/chinese/cnPracticeService';

type Ctx = { params: Promise<{ setId: string }> };

export const GET = withAuth(async (request, user, ctx) => {
	const { setId } = await (ctx as Ctx).params;
	const mode = request.nextUrl.searchParams.get('mode') ?? 'smart_mixed';
	const count = Number(request.nextUrl.searchParams.get('count') ?? 20);
	const wordId = request.nextUrl.searchParams.get('wordId')
		?? request.nextUrl.searchParams.get('word')
		?? undefined;

	const questions = await buildPracticeSession(user.id, setId, count, mode, wordId);
	if (!questions.length) return apiError('Không có từ nào có đủ dữ liệu để luyện', 404);
	return apiSuccess({ questions, total: questions.length, mode });
});
