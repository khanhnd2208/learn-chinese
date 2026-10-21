#!/usr/bin/env npx tsx
/**
 * Publish the HSK1 starter sets once, owned by an admin.
 * Learners follow them from Khám phá. This does not copy a set per user.
 * Run: npx tsx scripts/provision-global-sample-sets.ts
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { ObjectId } from 'mongodb';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

function adminEmails(): string[] {
	const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '';
	return raw.split(/[,;\s]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
}

async function main() {
	const { mongoClientPromise } = await import('@/lib/mongodbClient');
	const { ensureGlobalSampleSets } = await import('@/services/chinese/cnSampleSetService');

	const client = await mongoClientPromise;
	const emails = adminEmails();
	const user = await client.db().collection('users').findOne({
		$or: [
			{ role: 'admin' },
			...(emails.length ? [{ email: { $in: emails } }] : []),
		],
	});
	if (!user) {
		console.error('No admin user found. Set role=admin or ADMIN_EMAILS, then run again.');
		process.exit(1);
	}

	const userId = user._id instanceof ObjectId ? user._id.toString() : String(user._id);
	console.log(`Publishing HSK1 starter sets for admin ${userId.slice(0, 8)}…`);
	await ensureGlobalSampleSets(userId);
	console.log('Done.');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
