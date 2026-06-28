import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	CN_MAX_SMART_IMPORT_TEXT_CHARS,
	validateJsonContentLength,
	validateSmartImportText,
} from '@/lib/apiValidation';
import { importPastedTuVung, previewPastedTuVung } from '@/services/chinese/cnExcelService';

const bodySchema = z.object({
	action: z.enum(['preview', 'publish']),
	setName: z.string().optional(),
	text: z.string()
		.min(1, 'Chưa có dữ liệu để import')
		.max(CN_MAX_SMART_IMPORT_TEXT_CHARS, `Dữ liệu quá dài (tối đa ${CN_MAX_SMART_IMPORT_TEXT_CHARS.toLocaleString('vi-VN')} ký tự)`),
});

export const POST = withAuth(async (request, user) => {
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

	const { action, setName, text } = parsed.data;
	const textError = validateSmartImportText(text);
	if (textError) return apiError(textError, 400);

	if (action === 'preview') {
		const preview = await previewPastedTuVung(text, setName, user.id);
		return apiSuccess({ preview });
	}

	const result = await importPastedTuVung(user.id, text, setName);
	if (result.errors.length) {
		return apiError(`Import có ${result.errors.length} lỗi — sửa trước khi publish`, 400);
	}
	return apiSuccess({ result });
});
