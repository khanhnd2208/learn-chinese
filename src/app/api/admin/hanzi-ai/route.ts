import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { listHanziAiAdminAnalyses, getHanziAiHealth, reconcileHanziAiDependencies, purgeOldHanziAiAttempts, markLegacyPromptAnalysesStale } from '@/services/chinese/hanziAi/hanziAiAdminService';

export const GET = withAdmin(async (request) => {
	const status = request.nextUrl.searchParams.get('status') ?? undefined;
	const [analyses, health] = await Promise.all([listHanziAiAdminAnalyses(status), getHanziAiHealth()]);
	return apiSuccess({ analyses, health });
});

export const POST = withAdmin(async (request) => {
	const body = await request.json() as { action?: unknown; retentionDays?: unknown };
	if (body.action === 'reconcile') return apiSuccess(await reconcileHanziAiDependencies());
	if (body.action === 'mark_legacy_stale') return apiSuccess(await markLegacyPromptAnalysesStale());
	if (body.action === 'purge_attempts') {
		const days = typeof body.retentionDays === 'number'
			? Math.min(365, Math.max(1, Math.floor(body.retentionDays)))
			: 30;
		return apiSuccess({ purged: await purgeOldHanziAiAttempts(days) });
	}
	return apiError('Action không hợp lệ', 400);
});

