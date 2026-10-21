/* ════════════════════════════════════════════════════════════════════════
   Seed user lookup — MongoDB user id for npm run db:seed
   ════════════════════════════════════════════════════════════════════════ */
import { MongoClient } from 'mongodb';

async function findUserIdByEmail(client: MongoClient, dbName: string, email: string): Promise<string | null> {
	const user = await client.db(dbName).collection('users').findOne({ email });
	return user?._id?.toString() ?? null;
}

export async function resolveSeedUserId(): Promise<string | null> {
	const direct = process.env.SEED_USER_ID?.trim();
	if (direct) return direct;

	const email = (process.env.SEED_USER_EMAIL ?? process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL)?.split(',')[0]?.trim();
	if (!email) return null;

	const uri = process.env.MONGODB_URI;
	if (!uri) return null;

	const client = new MongoClient(uri);
	try {
		await client.connect();
		const primaryDb = new URL(uri).pathname.replace(/^\//, '') || 'learn_chinese_auth';
		const fromPrimary = await findUserIdByEmail(client, primaryDb, email);
		if (fromPrimary) return fromPrimary;

		const fallbackDb = process.env.SEED_AUTH_DB?.trim();
		if (!fallbackDb || fallbackDb === primaryDb) return null;

		try {
			return await findUserIdByEmail(client, fallbackDb, email);
		} catch {
			return null;
		}
	} finally {
		await client.close();
	}
}
