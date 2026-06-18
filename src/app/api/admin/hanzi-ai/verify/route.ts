import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { updateCuratedVerification } from '@/services/chinese/hanziAi/hanziAiAdminService';

export const POST = withAdmin(async (request, user) => {
	const body = await request.json() as Record<string, unknown>;
	if ((body.type !== 'word' && body.type !== 'hanzi') || typeof body.id !== 'string'
		|| !Array.isArray(body.systemCheckedFields) || !Array.isArray(body.expertVerifiedFields)
		|| !body.systemCheckedFields.every((v) => typeof v === 'string')
		|| !body.expertVerifiedFields.every((v) => typeof v === 'string')) {
		return apiError('Dữ liệu xác minh không hợp lệ', 400);
	}
	await updateCuratedVerification({
		type: body.type, id: body.id,
		systemCheckedFields: body.systemCheckedFields as string[],
		expertVerifiedFields: body.expertVerifiedFields as string[], adminId: user.id,
	});
	return apiSuccess({ updated: true });
});

