/* ════════════════════════════════════════════════════════════════════════
   Prisma Client Singleton (Prisma 7 + pg driver adapter)
   
   Prisma 7 requires a driver adapter instead of reading DATABASE_URL
   directly. We use @prisma/adapter-pg backed by the existing pg Pool.
   
   Caches the client in globalThis to prevent connection pool exhaustion
   during Next.js Hot-Module-Replacement and serverless cold starts.
   
   Usage:
     import { prisma } from '@/lib/prisma';
   ════════════════════════════════════════════════════════════════════════ */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { _prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
	const connectionString = process.env.DATABASE_URL;
	const pool = new Pool(
		connectionString
			? { connectionString, max: 10, idleTimeoutMillis: 30_000 }
			: {
					host: process.env.PG_HOST ?? 'localhost',
					port: Number(process.env.PG_PORT ?? 5432),
					user: process.env.PG_USER ?? 'postgres',
					password: process.env.PG_PASSWORD ?? '',
					database: process.env.PG_DATABASE ?? 'learn_chinese',
					max: 10,
					idleTimeoutMillis: 30_000,
			  },
	);
	const adapter = new PrismaPg(pool);
	return new PrismaClient({
		adapter,
		log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
	});
}

export const prisma: PrismaClient =
	globalForPrisma._prisma ?? createPrismaClient();

// Preserve across hot reloads in dev
if (process.env.NODE_ENV !== 'production') {
	globalForPrisma._prisma = prisma;
}
