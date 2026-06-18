import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { validateImportFile } from '@/lib/apiValidation';
import {
	RATE_LIMIT_IMPORT_PER_MIN,
	RATE_LIMIT_WINDOW_MS,
} from '@/config/constants';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { parseChineseImportFile } from '@/lib/chinese/parseChineseFile';
import { publishImportPreview } from '@/services/chinese/cnImportService';
import { listPublishedWords } from '@/services/chinese/cnContentService';

export const GET = withAdmin(async () => {
	const words = await listPublishedWords(100);
	return apiSuccess({ words, total: words.length });
});

export const POST = withAdmin(async (request, user) => {
	const limit = checkRateLimit(rateLimitKey(user.id, 'admin/import'), {
		limit: RATE_LIMIT_IMPORT_PER_MIN,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.allowed) {
		return apiError('Quá nhiều yêu cầu import — thử lại sau', 429);
	}

	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('multipart/form-data')) {
		return apiError('multipart/form-data required', 400);
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const type = (formData.get('type') as string) === 'hanzi' ? 'hanzi' : 'words';
	const action = (formData.get('action') as string) ?? 'preview';

	if (!file) return apiError('file is required', 400);

	const fileError = validateImportFile(file);
	if (fileError) return apiError(fileError, 400);

	const preview = await parseChineseImportFile(file, type);
	if (action === 'preview') {
		return apiSuccess({ preview });
	}

	const result = await publishImportPreview(preview, type);
	return apiSuccess({ result, preview });
});
