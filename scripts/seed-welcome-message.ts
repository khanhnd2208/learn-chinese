#!/usr/bin/env npx tsx
/**
 * Seed a personal message for a specific user.
 * Usage: npx tsx scripts/seed-welcome-message.ts
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

async function main() {
	const { prisma } = await import('../src/lib/prisma.js');
	const { findMongoUserByEmail } = await import('../src/lib/chinese/mongoUsers.js');

	const recipientEmail = process.env.SEED_MSG_EMAIL ?? 'admin@example.com';
	const content = process.env.SEED_MSG_CONTENT ?? 'Test đi';

	const recipient = await findMongoUserByEmail(recipientEmail);
	if (!recipient) {
		console.error(`Không tìm thấy user: ${recipientEmail}`);
		process.exit(1);
	}

	const existing = await prisma.cnUserMessage.findFirst({
		where: { userId: recipient.id, dismissedAt: null, content },
	});
	if (existing) {
		console.log('Tin nhắn đã tồn tại, bỏ qua.');
		await prisma.$disconnect();
		return;
	}

	await prisma.cnUserMessage.create({
		data: {
			userId: recipient.id,
			recipientEmail: recipient.email,
			content,
			createdById: recipient.id,
		},
	});

	console.log(`✓ Đã tạo tin nhắn cho ${recipient.name || recipient.email}: "${content}"`);
	await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
