import { z } from 'zod';
import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { listPendingEnglishDisputes, resolveEnglishDispute } from '@/services/english/enAnswerService';

const bodySchema = z.object({
	disputeId: z.string().min(1),
	decision: z.enum(['accepted', 'rejected']),
}).strict();

export const GET = withAdmin(async () => {
	const disputes = await listPendingEnglishDisputes();
	return apiSuccess({ disputes });
});

export const POST = withAdmin(async (request, user) => {
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Quyết định không hợp lệ', 400);
	await resolveEnglishDispute(user.id, parsed.data.disputeId, parsed.data.decision);
	return apiSuccess({ resolved: true });
});
