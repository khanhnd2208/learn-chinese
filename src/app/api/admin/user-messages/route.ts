import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import {
	listAdminUserMessages,
	createUserMessage,
} from '@/services/chinese/cnUserMessageService';
import { listMongoUsers } from '@/lib/chinese/mongoUsers';

export const GET = withAdmin(async (req) => {
	const { searchParams } = req.nextUrl;
	if (searchParams.get('action') === 'users') {
		const users = await listMongoUsers();
		return apiSuccess({ users });
	}
	const messages = await listAdminUserMessages(50);
	return apiSuccess({ messages });
});

export const POST = withAdmin(async (req, user) => {
	const body = await req.json() as { recipientEmail?: string; content?: string };

	if (!body.recipientEmail || !body.content) {
		return apiError('recipientEmail và content là bắt buộc', 400);
	}

	const message = await createUserMessage({
		recipientEmail: body.recipientEmail,
		content: body.content,
		createdById: user.id,
	});

	return apiSuccess({ message }, 201);
});
