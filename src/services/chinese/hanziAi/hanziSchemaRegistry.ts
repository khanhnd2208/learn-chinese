import {
	hanziAiDraftSchema,
	hanziAnalysisResultSchema,
	hanziAnalysisResultSchemaV1,
	type HanziAiDraftResult,
	type HanziAnalysisResult,
} from './hanziAnalysisSchema';

const CURRENT_SCHEMA_VERSION = Number(process.env.HANZI_AI_SCHEMA_VERSION ?? '2');
const SUPPORTED_READ_VERSIONS = new Set([1, 2]);

export function getCurrentHanziSchemaVersion(): number {
	return CURRENT_SCHEMA_VERSION;
}

export function isHanziSchemaReadable(version: number): boolean {
	return SUPPORTED_READ_VERSIONS.has(version);
}

export function parseHanziRevisionResult(
	value: unknown,
	schemaVersion: number,
): { ok: true; data: HanziAnalysisResult; legacy: boolean } | { ok: false } {
	if (!isHanziSchemaReadable(schemaVersion)) return { ok: false };
	if (schemaVersion === 2) {
		const parsed = hanziAnalysisResultSchema.safeParse(value);
		return parsed.success ? { ok: true, data: parsed.data, legacy: false } : { ok: false };
	}
	if (schemaVersion === 1) {
		const parsed = hanziAnalysisResultSchemaV1.safeParse(value);
		if (!parsed.success) return { ok: false };
		return { ok: false };
	}
	return { ok: false };
}

export function parseHanziDraft(value: unknown): { ok: true; data: HanziAiDraftResult } | { ok: false; errors: string[] } {
	const parsed = hanziAiDraftSchema.safeParse(value);
	if (!parsed.success) {
		return {
			ok: false,
			errors: parsed.error.issues.slice(0, 12).map((i) => `${i.path.join('.')}: ${i.message}`),
		};
	}
	return { ok: true, data: parsed.data };
}
