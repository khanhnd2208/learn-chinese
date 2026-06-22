import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { buildMarkKnownDiagnostic } from '@/services/chinese/cnPracticeService';

export const POST = withAuth(async (request, user) => {
	const body = await request.json() as { wordId?: string };
	if (!body.wordId) return apiError('Cần wordId', 400);

	const questions = await buildMarkKnownDiagnostic(user.id, body.wordId);
	if (!questions.length) return apiError('Không tạo được bài kiểm tra nhanh', 404);

	return apiSuccess({ questions });
});
