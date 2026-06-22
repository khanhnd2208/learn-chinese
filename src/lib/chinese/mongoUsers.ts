import { ObjectId } from 'mongodb';

import { mongoClientPromise } from '@/lib/mongodbClient';

export interface MongoUserProfile {
	id: string;
	name: string;
	email: string;
}

function toProfile(doc: { _id: unknown; name?: unknown; email?: unknown }): MongoUserProfile {
	const id = doc._id instanceof ObjectId ? doc._id.toString() : String(doc._id);
	return {
		id,
		name: typeof doc.name === 'string' ? doc.name : '',
		email: typeof doc.email === 'string' ? doc.email : '',
	};
}

export async function listMongoUsers(): Promise<MongoUserProfile[]> {
	const client = await mongoClientPromise;
	const users = await client
		.db()
		.collection('users')
		.find({}, { projection: { _id: 1, name: 1, email: 1 } })
		.sort({ email: 1 })
		.toArray();

	return users.map((u) => toProfile(u));
}

export async function findMongoUserByEmail(email: string): Promise<MongoUserProfile | null> {
	const normalized = email.trim().toLowerCase();
	if (!normalized) return null;

	const client = await mongoClientPromise;
	const user = await client
		.db()
		.collection('users')
		.findOne({ email: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });

	return user ? toProfile(user) : null;
}
