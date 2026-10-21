import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { CN_LEARN_BATCH_SIZE } from '@/config/constants';
import { getLearnQuiz } from '@/services/chinese/cnLearnService';

export const GET = withAuth(async (request, user) => {
	const raw = request.nextUrl.searchParams.get('wordIds') ?? '';
	const wordIds = raw.split(',').map((id) => id.trim()).filter(Boolean);
	if (wordIds.length < 1 || wordIds.length > CN_LEARN_BATCH_SIZE) {
		return apiError(`wordIds phải có 1–${CN_LEARN_BATCH_SIZE} từ`, 400);
	}
	const quiz = await getLearnQuiz(user.id, wordIds);
	return apiSuccess(quiz);
});