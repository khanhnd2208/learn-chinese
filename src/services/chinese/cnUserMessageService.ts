import { prisma } from '@/lib/prisma';
import { findMongoUserByEmail } from '@/lib/chinese/mongoUsers';

export interface UserMessageDTO {
	id: string;
	content: string;
	createdAt: string;
}

export interface AdminUserMessageDTO {
	id: string;
	userId: string;
	recipientEmail: string;
	recipientName: string;
	content: string;
	dismissedAt: string | null;
	createdAt: string;
}

export async function getPendingUserMessage(userId: string): Promise<UserMessageDTO | null> {
	const row = await prisma.cnUserMessage.findFirst({
		where: { userId, dismissedAt: null },
		orderBy: { createdAt: 'desc' },
		select: { id: true, content: true, createdAt: true },
	});

	if (!row) return null;

	return {
		id: row.id,
		content: row.content,
		createdAt: row.createdAt.toISOString(),
	};
}

export async function dismissUserMessage(userId: string, messageId: string): Promise<boolean> {
	const result = await prisma.cnUserMessage.updateMany({
		where: { id: messageId, userId, dismissedAt: null },
		data: { dismissedAt: new Date() },
	});

	return result.count > 0;
}

export async function createUserMessage(params: {
	recipientEmail: string;
	content: string;
	createdById: string;
}): Promise<AdminUserMessageDTO> {
	const recipient = await findMongoUserByEmail(params.recipientEmail);
	if (!recipient) {
		throw new Error('Không tìm thấy người dùng với email này');
	}

	const trimmed = params.content.trim();
	if (!trimmed) {
		throw new Error('Nội dung tin nhắn không được để trống');
	}

	const row = await prisma.cnUserMessage.create({
		data: {
			userId: recipient.id,
			recipientEmail: recipient.email,
			content: trimmed,
			createdById: params.createdById,
		},
	});

	return {
		id: row.id,
		userId: row.userId,
		recipientEmail: row.recipientEmail,
		recipientName: recipient.name,
		content: row.content,
		dismissedAt: null,
		createdAt: row.createdAt.toISOString(),
	};
}

export async function listAdminUserMessages(limit = 50): Promise<AdminUserMessageDTO[]> {
	const rows = await prisma.cnUserMessage.findMany({
		orderBy: { createdAt: 'desc' },
		take: limit,
	});

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		recipientEmail: row.recipientEmail,
		recipientName: '',
		content: row.content,
		dismissedAt: row.dismissedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	}));
}
