import NextAuth from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { ObjectId } from 'mongodb';

import { mongoClientPromise } from '@/lib/mongodbClient';
import { authConfig } from '@/lib/auth.config';

function parseAdminEmails(): string[] {
	const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? '';
	return raw
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

function isAdminEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	return parseAdminEmails().includes(email.trim().toLowerCase());
}

const nextAuth = NextAuth({
	...authConfig,
	adapter: MongoDBAdapter(mongoClientPromise),
	callbacks: {
		...authConfig.callbacks,
		async jwt({ token, user, trigger }) {
			if (user) {
				try {
					const client = await mongoClientPromise;
					const db = client.db();
					const dbUser = await db.collection('users').findOne(
						{ _id: new ObjectId(user.id!) },
						{ projection: { role: 1 } },
					);
					token.role = dbUser?.role ?? (isAdminEmail(user.email) ? 'admin' : 'student');
				} catch {
					token.role = isAdminEmail(user.email) ? 'admin' : 'student';
				}
			} else if (trigger === 'update') {
				try {
					const client = await mongoClientPromise;
					const dbUser = await client.db().collection('users').findOne(
						{ _id: new ObjectId(token.sub!) },
						{ projection: { role: 1 } },
					);
					if (dbUser?.role) token.role = dbUser.role;
				} catch { /* keep */ }
			}
			if (!token.role) token.role = 'student';
			return token;
		},
	},
	events: {
		async createUser({ user }) {
			try {
				const client = await mongoClientPromise;
				const role = isAdminEmail(user.email) ? 'admin' : 'student';
				await client.db().collection('users').updateOne(
					{ _id: new ObjectId(user.id!) },
					{ $set: { role } },
				);
			} catch (error) {
				console.error('[auth] createUser failed:', error);
			}
		},
	},
});

export const { GET, POST } = nextAuth.handlers;
export const { auth, signIn, signOut } = nextAuth;
