import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { englishAreaOpenForRole } from '@/lib/english/access';
import { englishSessionSchema } from '@/lib/english/schemas';
import { buildEnglishSession } from '@/services/english/enSessionService';

export const POST = withAuth(async (request, user) => {
	if (!englishAreaOpenForRole(user.role)) return apiError('Phần tiếng Anh chưa được mở', 403);
	const parsed = englishSessionSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Phiên học không hợp lệ', 400);
	const session = await buildEnglishSession(user.id, parsed.data);
	return apiSuccess(session);
});
