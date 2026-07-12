import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	CN_MAX_SMART_IMPORT_TEXT_CHARS,
	validateJsonContentLength,
	validateSmartImportText,
} from '@/lib/apiValidation';
import { importTuVungIntoSet, previewTuVungIntoSet } from '@/services/chinese/cnExcelService';

const bodySchema = z.object({
	action: z.enum(['preview', 'publish']),
	text: z.string()
		.min(1, 'Chưa có dữ liệu để import')
		.max(CN_MAX_SMART_IMPORT_TEXT_CHARS, `Dữ liệu quá dài (tối đa ${CN_MAX_SMART_IMPORT_TEXT_CHARS.toLocaleString('vi-VN')} ký tự)`),
});

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (request, user, ctx) => {
	const contentLengthError = validateJsonContentLength(request.headers);
	if (contentLengthError) return apiError(contentLengthError, 400);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return apiError('JSON body required', 400);
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		const first = parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ';
		return apiError(first, 400);
	}

	const { action, text } = parsed.data;
	const textError = validateSmartImportText(text);
	if (textError) return apiError(textError, 400);

	const { id: setId } = await (ctx as Ctx).params;

	if (action === 'preview') {
		const preview = await previewTuVungIntoSet(user.id, setId, text);
		if (!preview) return apiError('Không tìm thấy bộ từ', 404);
		return apiSuccess({ preview });
	}

	const result = await importTuVungIntoSet(user.id, setId, text);
	if (!result) return apiError('Không tìm thấy bộ từ', 404);
	if (result.preview.errors.length) {
		return apiError(`Import có ${result.preview.errors.length} lỗi — sửa trước khi publish`, 400);
	}
	return apiSuccess({ result: result.preview, addedCount: result.addedCount });
});
