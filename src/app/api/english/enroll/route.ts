import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { englishAreaOpenForRole } from '@/lib/english/access';
import { enrollEnglishSet } from '@/services/english/enCatalogService';

const bodySchema = z.object({ setId: z.string().min(1) }).strict();

export const POST = withAuth(async (request, user) => {
	if (!englishAreaOpenForRole(user.role)) return apiError('Phần tiếng Anh chưa được mở', 403);
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Thiếu bộ học', 400);
	await enrollEnglishSet(user.id, parsed.data.setId);
	return apiSuccess({ enrolled: true });
});
