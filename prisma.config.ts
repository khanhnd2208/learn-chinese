import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';

expand(config({ path: resolve(process.cwd(), '.env') }));
expand(config({ path: resolve(process.cwd(), '.env.local'), override: true }));
import { defineConfig } from 'prisma/config';

function shadowDatabaseUrl(): string | undefined {
	if (process.env.SHADOW_DATABASE_URL) return process.env.SHADOW_DATABASE_URL;
	const url = process.env.DATABASE_URL;
	if (!url) return undefined;
	try {
		const parsed = new URL(url);
		parsed.pathname = '/prisma_migrate_shadow';
		return parsed.toString();
	} catch {
		return undefined;
	}
}

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
	},
	datasource: {
		url: process.env['DATABASE_URL'],
		shadowDatabaseUrl: shadowDatabaseUrl(),
	},
});
