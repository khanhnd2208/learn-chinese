import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	RATE_LIMIT_MARK_KNOWN_PER_MIN,
	RATE_LIMIT_WINDOW_MS,
} from '@/config/constants';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { markChannelAsKnown } from '@/services/chinese/cnSrsService';
import type { CnQuestionType } from '@/types/chinese';

const VALID_TYPES = new Set<string>([
	'hanzi_to_meaning', 'meaning_to_hanzi', 'pinyin_to_hanzi',
	'audio_to_hanzi', 'audio_to_meaning', 'audio_to_pinyin',
	'audio_to_pinyin_typed', 'hanzi_from_meaning',
	'fill_sentence', 'sentence_order', 'radical_pick', 'char_components', 'similar_char', 'translate_sentence',
]);

export const POST = withAuth(async (request, user) => {
	const limit = checkRateLimit(rateLimitKey(user.id, 'review/mark-known'), {
		limit: RATE_LIMIT_MARK_KNOWN_PER_MIN,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.allowed) {
		return apiError('Quá nhiều yêu cầu — thử lại sau', 429);
	}

	const body = await request.json() as { wordId?: string; questionType?: string };
	if (!body.wordId || !body.questionType || !VALID_TYPES.has(body.questionType)) {
		return apiError('Cần wordId và questionType hợp lệ', 400);
	}

	const result = await markChannelAsKnown(
		user.id,
		body.wordId,
		body.questionType as CnQuestionType,
	);
	return apiSuccess(result);
});
