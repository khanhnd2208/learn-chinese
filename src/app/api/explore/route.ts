import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { listExploreSets } from '@/services/chinese/cnEnrollmentService';

export const GET = withAuth(async (request, user) => {
	const params = new URL(request.url).searchParams;
	const q = params.get('q') ?? undefined;
	const levelRaw = params.get('level');
	let level: number | undefined;
	if (levelRaw) {
		level = Number(levelRaw);
		if (!Number.isInteger(level) || level < 1 || level > 9) {
			return apiError('level không hợp lệ', 400);
		}
	}
	const sets = await listExploreSets(user.id, { q, level });
	return apiSuccess({ sets });
});
