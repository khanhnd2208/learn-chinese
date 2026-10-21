import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { EN_MAX_JSON_BODY_BYTES } from '@/lib/english/constants';
import { assessEnglishPack } from '@/lib/english/contentValidation';
import { draftsForAssessedPack } from '@/lib/english/questions';
import { saveEnglishPack } from '@/services/english/enContentService';

const bodySchema = z.object({
	action: z.enum(['preview', 'save']),
	pack: z.unknown(),
});

export const POST = withAdmin(async (request) => {
	const rawLength = request.headers.get('content-length');
	if (rawLength && Number(rawLength) > EN_MAX_JSON_BODY_BYTES) {
		return apiError('Gói nội dung quá lớn', 400);
	}
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Gói nội dung không hợp lệ', 400);
	if (parsed.data.action === 'preview') {
		const assessment = assessEnglishPack(parsed.data.pack);
		if (assessment.schemaError) return apiError(assessment.schemaError, 400);
		return apiSuccess({
			issues: assessment.issues,
			drafts: draftsForAssessedPack(assessment).length,
		});
	}
	const saved = await saveEnglishPack(parsed.data.pack);
	return apiSuccess(saved, 201);
});
