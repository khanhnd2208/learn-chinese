import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	RATE_LIMIT_MARK_KNOWN_PER_MIN,
	RATE_LIMIT_WINDOW_MS,
} from '@/config/constants';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { reconcileSubmitItems } from '@/lib/chinese/answerGrading';
import { validatePracticeSubmitItems } from '@/lib/apiValidation';
import { CORE_QUESTION_TYPE_SET } from '@/lib/chinese/coreQuestionTypes';
import { markChannelAsKnown } from '@/services/chinese/cnSrsService';
import type { CnQuestionType } from '@/types/chinese';

const VALID_TYPES = CORE_QUESTION_TYPE_SET;

export const POST = withAuth(async (request, user) => {
	const limit = checkRateLimit(rateLimitKey(user.id, 'review/mark-known'), {
		limit: RATE_LIMIT_MARK_KNOWN_PER_MIN,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.allowed) {
		return apiError('Quá nhiều yêu cầu — thử lại sau', 429);
	}

	const body = await request.json() as {
		wordId?: string;
		questionType?: string;
		diagnosticItems?: unknown;
	};
	if (!body.wordId || !body.questionType || !VALID_TYPES.has(body.questionType)) {
		return apiError('Cần wordId và questionType hợp lệ', 400);
	}

	if (!validatePracticeSubmitItems(body.diagnosticItems) || body.diagnosticItems.length < 2) {
		return apiError('Cần hoàn thành kiểm tra nhanh (ít nhất 2 câu)', 400);
	}

	const reconciled = await reconcileSubmitItems(body.diagnosticItems);
	const correctCount = reconciled.filter((i) => i.correct).length;
	if (correctCount < 2) {
		return apiError('Chưa đủ chắc — hãy ôn thêm trước khi đánh dấu đã biết', 400);
	}

	const result = await markChannelAsKnown(
		user.id,
		body.wordId,
		body.questionType as CnQuestionType,
	);
	return apiSuccess(result);
});
