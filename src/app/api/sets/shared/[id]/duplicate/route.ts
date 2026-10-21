import { withAuth, apiError } from '@/lib/apiUtils';

/** Copying a shared set is retired. Learners follow the original. */
export const POST = withAuth(async () => {
	return apiError('Theo học bộ từ gốc thay vì sao chép', 410);
});
