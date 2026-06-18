import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	acceptHanziAiCandidate, blockHanziAiAnalysis, editHanziAiAnalysis,
	getHanziAiAdminDetail, rejectHanziAiCandidate, resolveHanziAiReport,
} from '@/services/chinese/hanziAi/hanziAiAdminService';
import { generateHanziAiAnalysis } from '@/services/chinese/hanziAi/hanziAnalysisService';

type Ctx = { params: Promise<{ id: string }> };
export const maxDuration = 90;

export const GET = withAdmin(async (_request, _user, context) => {
	const { id } = await (context as Ctx).params;
	const detail = await getHanziAiAdminDetail(id);
	return detail ? apiSuccess(detail) : apiError('Không tìm thấy phân tích', 404);
});

export const POST = withAdmin(async (request, user, context) => {
	const { id } = await (context as Ctx).params;
	const body = await request.json() as Record<string, unknown>;
	const action = body.action;
	if (action === 'regenerate') {
		const detail = await getHanziAiAdminDetail(id);
		if (!detail) return apiError('Không tìm thấy phân tích', 404);
		return apiSuccess(await generateHanziAiAnalysis(detail.normalizedTerm, user, { forceRegenerate: true }));
	}
	if (action === 'block' || action === 'unblock') {
		if (typeof body.expectedContentVersion !== 'number') return apiError('expectedContentVersion is required', 400);
		await blockHanziAiAnalysis(id, user.id, body.expectedContentVersion, action === 'block');
		return apiSuccess({ updated: true });
	}
	if (action === 'edit') {
		if (typeof body.expectedContentVersion !== 'number') return apiError('expectedContentVersion is required', 400);
		return apiSuccess(await editHanziAiAnalysis(id, user.id, body.expectedContentVersion, body.result));
	}
	if (action === 'accept_candidate' || action === 'reject_candidate') {
		if (typeof body.revisionId !== 'string') return apiError('revisionId is required', 400);
		if (action === 'accept_candidate') {
			if (typeof body.expectedContentVersion !== 'number') return apiError('expectedContentVersion is required', 400);
			await acceptHanziAiCandidate(id, body.revisionId, user.id, body.expectedContentVersion);
		} else await rejectHanziAiCandidate(id, body.revisionId);
		return apiSuccess({ updated: true });
	}
	if (action === 'resolve_report' || action === 'dismiss_report') {
		if (typeof body.reportId !== 'string') return apiError('reportId is required', 400);
		await resolveHanziAiReport(body.reportId, user.id, action === 'resolve_report' ? 'resolved' : 'dismissed');
		return apiSuccess({ updated: true });
	}
	return apiError('Action không hợp lệ', 400);
});

