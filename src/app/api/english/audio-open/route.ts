import { withAuth, apiSuccess, apiError } from '@/lib/apiUtils';
import { englishAreaOpenForRole } from '@/lib/english/access';
import { englishAudioOpenSchema } from '@/lib/english/schemas';
import { recordEnglishAudioOpen } from '@/services/english/enAnswerService';

export const POST = withAuth(async (request, user) => {
	if (!englishAreaOpenForRole(user.role)) return apiError('Phần tiếng Anh chưa được mở', 403);
	const parsed = englishAudioOpenSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return apiError('Thiếu mã câu hỏi', 400);
	await recordEnglishAudioOpen(user.id, parsed.data);
	return apiSuccess({ opened: true });
});
