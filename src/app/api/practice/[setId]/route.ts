import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { CN_DEFAULT_PRACTICE_COUNT } from '@/config/constants';
import { parseBoundedIntParam, CN_MAX_PRACTICE_COUNT } from '@/lib/apiValidation';
import { buildPracticeSession } from '@/services/chinese/cnPracticeService';

type Ctx = { params: Promise<{ setId: string }> };

export const GET = withAuth(async (request, user, ctx) => {
	const { setId } = await (ctx as Ctx).params;
	const mode = request.nextUrl.searchParams.get('mode') ?? 'smart_mixed';
	const count = parseBoundedIntParam(request.nextUrl.searchParams.get('count'), {
		defaultValue: CN_DEFAULT_PRACTICE_COUNT,
		min: 1,
		max: CN_MAX_PRACTICE_COUNT,
	});
	if (count === null) return apiError(`count phải là số nguyên 1–${CN_MAX_PRACTICE_COUNT}`, 400);
	const wordId = request.nextUrl.searchParams.get('wordId')
		?? request.nextUrl.searchParams.get('word')
		?? undefined;

	const questions = await buildPracticeSession(user.id, setId, count, mode, wordId);
	if (!questions.length) {
		const message = mode === 'sentence'
			? 'Không có từ nào có câu ví dụ đủ điều kiện điền từ (cần ví dụ chứa từ mục tiêu)'
			: 'Không có từ nào có đủ dữ liệu để luyện';
		return apiError(message, 404);
	}
	return apiSuccess({ questions, total: questions.length, mode });
});
