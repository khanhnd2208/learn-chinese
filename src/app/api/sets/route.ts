import { withAdmin, withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { validateJsonContentLength, validateSetTerms } from '@/lib/apiValidation';
import { listEnrolledSets } from '@/services/chinese/cnEnrollmentService';
import {
	createUserSet,
	createSetFromHsk,
	listUserSets,
} from '@/services/chinese/cnSetService';
import type { CreateCnWordSetInput } from '@/types/chinese';

export const GET = withAuth(async (request, user) => {
	const scope = new URL(request.url).searchParams.get('scope');
	if (scope === 'admin') {
		if (user.role !== 'admin') return apiError('Forbidden', 403);
		const items = await listUserSets(user.id);
		return apiSuccess({ items, total: items.length });
	}
	const items = await listEnrolledSets(user.id);
	return apiSuccess({ items, total: items.length });
});

export const POST = withAdmin(async (request, user) => {
	const contentLengthError = validateJsonContentLength(request.headers);
	if (contentLengthError) return apiError(contentLengthError, 400);

	const body = await request.json() as CreateCnWordSetInput & { hskLevel?: number };
	if (body.hskLevel) {
		const result = await createSetFromHsk(
			user.id,
			body.hskLevel,
			body.title?.trim() || `HSK ${body.hskLevel}`,
			body.srsActive,
		);
		return apiSuccess(result, 201);
	}
	if (!body.title?.trim()) return apiError('title is required', 400);
	if (!validateSetTerms(body.terms)) {
		return apiError('terms không hợp lệ (cần 1–200 từ, không rỗng)', 400);
	}
	const result = await createUserSet(user.id, body);
	return apiSuccess(result, 201);
});
