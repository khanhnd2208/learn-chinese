import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { reportHanziAiAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisService';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (request, user, context) => {
	const { id } = await (context as Ctx).params;
	const body = await request.json() as { reason?: unknown; note?: unknown };
	if (typeof body.reason !== 'string' || (body.note !== undefined && typeof body.note !== 'string')) {
		return apiError('Dữ liệu báo lỗi không hợp lệ', 400, 'INVALID_REPORT');
	}
	await reportHanziAiAnalysis(id, user.id, body.reason, typeof body.note === 'string' ? body.note : '');
	return apiSuccess({ reported: true });
});

