import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
	throw new Error('Missing MONGODB_URI');
}

type GlobalWithMongo = typeof globalThis & {
	_mongoClientPromise?: Promise<MongoClient>;
};

const globalWithMongo = globalThis as GlobalWithMongo;

let mongoClientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
	if (!globalWithMongo._mongoClientPromise) {
		const client = new MongoClient(uri);
		globalWithMongo._mongoClientPromise = client.connect();
	}
	mongoClientPromise = globalWithMongo._mongoClientPromise;
} else {
	const client = new MongoClient(uri);
	mongoClientPromise = client.connect();
}

export { mongoClientPromise };
