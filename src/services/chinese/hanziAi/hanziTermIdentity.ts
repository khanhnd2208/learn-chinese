import { normalizeHanziAiTerm } from './hanziNormalization';

export interface HanziTermIdentity {
	requestedTerm: string;
	displayTerm: string;
	canonicalTerm: string;
	script: 'simplified' | 'traditional' | 'mixed' | 'unknown';
}

const TRADITIONAL_HINT = /[媽國學體經過鬱憂寢廢寢練鑲寢]/u;
const SIMPLIFIED_HINT = /[妈妈国学习体经过]/u;

function detectScript(term: string): HanziTermIdentity['script'] {
	const hasTrad = TRADITIONAL_HINT.test(term) || Array.from(term).some((c) => {
		const cp = c.codePointAt(0)!;
		return cp >= 0x3400 && cp <= 0x4DBF;
	});
	const hasSimp = SIMPLIFIED_HINT.test(term);
	if (hasTrad && hasSimp) return 'mixed';
	if (hasTrad) return 'traditional';
	if (hasSimp) return 'simplified';
	return 'unknown';
}

/** Server-owned term fields — AI must not decide cache/lookup identity. */
export function resolveHanziTermIdentity(rawInput: string): HanziTermIdentity {
	const requestedTerm = normalizeHanziAiTerm(rawInput);
	return {
		requestedTerm,
		displayTerm: requestedTerm,
		canonicalTerm: requestedTerm,
		script: detectScript(requestedTerm),
	};
}

export function buildHanziCacheFingerprint(parts: {
	canonicalTerm: string;
	script: string;
	schemaVersion: number;
	promptVersion: string;
	policyVersion: string;
	registryVersion: number;
	trustContentFingerprint: string;
	hardFactsHash: string;
}): string {
	return [
		parts.canonicalTerm,
		parts.script,
		`s${parts.schemaVersion}`,
		parts.promptVersion,
		parts.policyVersion,
		`r${parts.registryVersion}`,
		parts.trustContentFingerprint.slice(0, 16),
		parts.hardFactsHash.slice(0, 16),
	].join('|');
}
