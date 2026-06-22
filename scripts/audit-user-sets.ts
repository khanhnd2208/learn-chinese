#!/usr/bin/env npx tsx
/**
 * Audit every user's word sets: upload vs sample, file count, word count.
 * Run: npx tsx scripts/audit-user-sets.ts
 */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { ObjectId } from 'mongodb';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

import {
	GLOBAL_SAMPLE_SET_DESCRIPTION,
	GLOBAL_SAMPLE_SET_TITLES,
} from '@/lib/chinese/hsk1SampleSets';
import { isLegacyDemoSet } from '@/lib/chinese/legacyDemoSets';

function isSampleSet(set: { title: string; description: string; source: string }): boolean {
	if (set.description === GLOBAL_SAMPLE_SET_DESCRIPTION) return true;
	if (GLOBAL_SAMPLE_SET_TITLES.includes(set.title as (typeof GLOBAL_SAMPLE_SET_TITLES)[number])) {
		return true;
	}
	return isLegacyDemoSet(set);
}

async function main() {
	const { mongoClientPromise } = await import('@/lib/mongodbClient');
	const { prisma } = await import('@/lib/prisma');

	const client = await mongoClientPromise;
	const mongoUsers = await client
		.db()
		.collection('users')
		.find({}, { projection: { _id: 1, name: 1, email: 1 } })
		.sort({ email: 1 })
		.toArray();

	const userMap = new Map(
		mongoUsers.map((u) => {
			const id = u._id instanceof ObjectId ? u._id.toString() : String(u._id);
			return [id, { name: (u.name as string | null) ?? '', email: (u.email as string | null) ?? '' }];
		}),
	);

	const sets = await prisma.cnWordSet.findMany({
		select: {
			id: true,
			userId: true,
			title: true,
			description: true,
			source: true,
			createdAt: true,
			_count: { select: { items: true } },
		},
		orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
	});

	type SetRow = (typeof sets)[number] & { kind: 'sample' | 'upload' };
	const classified: SetRow[] = sets.map((s) => ({
		...s,
		kind: isSampleSet(s) ? 'sample' : 'upload',
	}));

	const byUser = new Map<string, SetRow[]>();
	for (const s of classified) {
		(byUser.get(s.userId) ?? byUser.set(s.userId, []).get(s.userId)!).push(s);
	}

	// Users with sets but missing from Mongo (orphan userIds)
	for (const userId of byUser.keys()) {
		if (!userMap.has(userId)) {
			userMap.set(userId, { name: '(unknown)', email: userId });
		}
	}

	const rows: Array<{
		userId: string;
		name: string;
		email: string;
		uploadFiles: number;
		uploadWords: number;
		sampleFiles: number;
		sampleWords: number;
		totalFiles: number;
		totalWords: number;
		uploadTitles: string[];
		sampleTitles: string[];
	}> = [];

	for (const [userId, userSets] of [...byUser.entries()].sort((a, b) => {
		const ea = userMap.get(a[0])?.email ?? '';
		const eb = userMap.get(b[0])?.email ?? '';
		return ea.localeCompare(eb);
	})) {
		const profile = userMap.get(userId)!;
		const upload = userSets.filter((s) => s.kind === 'upload');
		const sample = userSets.filter((s) => s.kind === 'sample');
		rows.push({
			userId,
			name: profile.name,
			email: profile.email,
			uploadFiles: upload.length,
			uploadWords: upload.reduce((n, s) => n + s._count.items, 0),
			sampleFiles: sample.length,
			sampleWords: sample.reduce((n, s) => n + s._count.items, 0),
			totalFiles: userSets.length,
			totalWords: userSets.reduce((n, s) => n + s._count.items, 0),
			uploadTitles: upload.map((s) => `${s.title} (${s._count.items} từ)`),
			sampleTitles: sample.map((s) => `${s.title} (${s._count.items} từ)`),
		});
	}

	// Users in Mongo with zero sets
	for (const [userId, profile] of userMap) {
		if (!byUser.has(userId)) {
			rows.push({
				userId,
				name: profile.name,
				email: profile.email,
				uploadFiles: 0,
				uploadWords: 0,
				sampleFiles: 0,
				sampleWords: 0,
				totalFiles: 0,
				totalWords: 0,
				uploadTitles: [],
				sampleTitles: [],
			});
		}
	}

	rows.sort((a, b) => a.email.localeCompare(b.email));

	const totals = rows.reduce(
		(acc, r) => ({
			uploadFiles: acc.uploadFiles + r.uploadFiles,
			uploadWords: acc.uploadWords + r.uploadWords,
			sampleFiles: acc.sampleFiles + r.sampleFiles,
			sampleWords: acc.sampleWords + r.sampleWords,
		}),
		{ uploadFiles: 0, uploadWords: 0, sampleFiles: 0, sampleWords: 0 },
	);

	console.log('=== BÁO CÁO BỘ TỪ THEO USER (VPS) ===\n');
	for (const r of rows) {
		const label = r.name || r.email || r.userId.slice(0, 8);
		console.log(`👤 ${label}`);
		if (r.email) console.log(`   Email: ${r.email}`);
		console.log(`   Upload: ${r.uploadFiles} file, ${r.uploadWords} từ`);
		console.log(`   Sample: ${r.sampleFiles} file, ${r.sampleWords} từ`);
		console.log(`   Tổng:   ${r.totalFiles} file, ${r.totalWords} từ`);
		if (r.uploadTitles.length) {
			console.log('   └ Upload:');
			for (const t of r.uploadTitles) console.log(`      • ${t}`);
		}
		if (r.sampleTitles.length) {
			console.log('   └ Sample (cần xóa nếu còn):');
			for (const t of r.sampleTitles) console.log(`      • ${t}`);
		}
		console.log('');
	}

	console.log('=== TỔNG HỢP ===');
	console.log(`Users: ${rows.length}`);
	console.log(`Upload: ${totals.uploadFiles} file, ${totals.uploadWords} từ`);
	console.log(`Sample: ${totals.sampleFiles} file, ${totals.sampleWords} từ`);
	console.log(
		`Grand total: ${totals.uploadFiles + totals.sampleFiles} file, ${totals.uploadWords + totals.sampleWords} từ`,
	);

	await prisma.$disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
