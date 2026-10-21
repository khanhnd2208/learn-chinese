import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { publishEnglishSet } from '@/services/english/enContentService';

const bodySchema = z.object({ setId: z.string().min(1) }).strict();

export const POST = withAdmin(async (request) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Thiếu bộ học', 400);
	const result = await publishEnglishSet(parsed.data.setId);
	return apiSuccess(result);
});
