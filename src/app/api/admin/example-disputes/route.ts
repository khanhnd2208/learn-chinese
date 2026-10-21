import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { parseBoundedIntParam } from '@/lib/apiValidation';
import { listPendingDisputeGroups, resolveDisputeGroup } from '@/services/chinese/cnDisputeService';

export const GET = withAdmin(async (req) => {
	const page = parseBoundedIntParam(req.nextUrl.searchParams.get('page'), {
		defaultValue: 1,
		min: 1,
		max: 100,
	});
	if (page == null) return apiError('page không hợp lệ', 400);
	const groups = await listPendingDisputeGroups(page);
	return apiSuccess({ groups });
});

export const POST = withAdmin(async (req, user) => {
	const body = await req.json() as { exampleId?: string; answer?: string; action?: string };
	if (!body.exampleId || !body.answer || (body.action !== 'accept' && body.action !== 'reject')) {
		return apiError('exampleId, answer và action là bắt buộc', 400);
	}
	const result = await resolveDisputeGroup(user.id, body.exampleId, body.answer, body.action);
	return apiSuccess(result);
});
