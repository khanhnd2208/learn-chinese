#!/usr/bin/env npx tsx
/**
 * Provision global HSK1 sample sets for all MongoDB users.
 * Run: npx tsx scripts/provision-global-sample-sets.ts
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { ObjectId } from 'mongodb';
import { mongoClientPromise } from '@/lib/mongodbClient';
import { ensureGlobalSampleSets } from '@/services/chinese/cnSampleSetService';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

async function main() {
	const client = await mongoClientPromise;
	const users = await client.db().collection('users').find({}, { projection: { _id: 1 } }).toArray();

	console.log(`Provisioning sample sets for ${users.length} user(s)...`);
	let ok = 0;
	let failed = 0;

	for (const user of users) {
		const userId = user._id instanceof ObjectId ? user._id.toString() : String(user._id);
		try {
			await ensureGlobalSampleSets(userId);
			ok++;
			console.log(`  ✅ ${userId.slice(0, 8)}…`);
		} catch (error) {
			failed++;
			console.error(`  ❌ ${userId.slice(0, 8)}…`, error);
		}
	}

	console.log(`\nDone: ${ok} ok, ${failed} failed`);
	process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
