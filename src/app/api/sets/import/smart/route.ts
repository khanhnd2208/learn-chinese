import { z } from 'zod';
import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { importPastedTuVung, previewPastedTuVung } from '@/services/chinese/cnExcelService';

const bodySchema = z.object({
	action: z.enum(['preview', 'publish']),
	setName: z.string().min(1, 'Tên bộ từ không được để trống'),
	text: z.string().min(1, 'Chưa có dữ liệu để import'),
});

export const POST = withAuth(async (request, user) => {
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
