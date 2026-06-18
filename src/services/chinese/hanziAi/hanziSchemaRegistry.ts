import { hanziAnalysisResultSchema, type HanziAnalysisResult } from './hanziAnalysisSchema';

const CURRENT_SCHEMA_VERSION = Number(process.env.HANZI_AI_SCHEMA_VERSION ?? '1');
const SUPPORTED_READ_VERSIONS = new Set([1]);

export function getCurrentHanziSchemaVersion(): number {
	return CURRENT_SCHEMA_VERSION;
}

export function isHanziSchemaReadable(version: number): boolean {
	return SUPPORTED_READ_VERSIONS.has(version);
}

export function parseHanziRevisionResult(
	value: unknown,
	schemaVersion: number,
): { ok: true; data: HanziAnalysisResult } | { ok: false } {
	if (!isHanziSchemaReadable(schemaVersion)) return { ok: false };
	if (schemaVersion === 1) {
		const parsed = hanziAnalysisResultSchema.safeParse(value);
		return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
	}
	return { ok: false };
}
