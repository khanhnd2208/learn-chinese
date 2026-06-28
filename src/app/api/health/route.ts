import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type HealthState = 'ok' | 'error';

async function checkPostgres(): Promise<HealthState> {
	try {
		await prisma.$queryRaw`SELECT 1`;
		return 'ok';
	} catch {
		return 'error';
	}
}

async function checkMongo(): Promise<HealthState> {
	try {
		const { mongoClientPromise } = await import('@/lib/mongodbClient');
		const client = await mongoClientPromise;
		await client.db().command({ ping: 1 });
		return 'ok';
	} catch {
		return 'error';
	}
}

export async function GET() {
	const [postgres, mongo] = await Promise.all([checkPostgres(), checkMongo()]);
	const healthy = postgres === 'ok' && mongo === 'ok';
	const data = {
		status: healthy ? 'ok' : 'degraded',
		checks: {
			app: 'ok' as const,
			postgres,
			mongo,
		},
		timestamp: new Date().toISOString(),
	};

	return NextResponse.json(
		healthy
			? { ok: true, data }
			: { ok: false, error: 'Service unavailable' },
		{ status: healthy ? 200 : 503 },
	);
}
