import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { validateImportFile } from '@/lib/apiValidation';
import { importUserWorkbook, previewUserWorkbook } from '@/services/chinese/cnExcelService';

export const POST = withAdmin(async (request, user) => {
	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('multipart/form-data')) {
		return apiError('multipart/form-data required', 400);
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const action = (formData.get('action') as string) ?? 'preview';
	const restoreProgress = (formData.get('restoreProgress') as string) === 'true';

	if (!file) return apiError('file is required', 400);
	const fileError = validateImportFile(file);
	if (fileError) return apiError(fileError, 400);
	if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
		return apiError('Import bộ từ chỉ hỗ trợ Excel .xlsx/.xls', 400);
	}

	if (action === 'preview') {
		const preview = await previewUserWorkbook(file, user.id, { canCreateWords: user.role === 'admin' });
		return apiSuccess({ preview });
	}

	const result = await importUserWorkbook(user.id, file, restoreProgress, { canCreateWords: user.role === 'admin' });
	if (result.errors.length) {
		return apiError(`Import có ${result.errors.length} lỗi — sửa trước khi publish`, 400);
	}
	return apiSuccess({ result });
});
