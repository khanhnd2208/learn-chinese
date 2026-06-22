import type { HanziAiDraftResult } from './hanziAnalysisSchema';
import { resolveHanziTermIdentity } from './hanziTermIdentity';

const STRUCTURE_ALIASES: Record<string, HanziAiDraftResult['characters'][0]['structureType']> = {
	complex: 'unknown',
	surround: 'enclosure',
	semi_encircling: 'partial_enclosure',
	partial_surround: 'partial_enclosure',
};

export function preNormalizeAiDraft(raw: unknown, requestedTerm: string): unknown {
	if (!raw || typeof raw !== 'object') return raw;
	const draft = structuredClone(raw) as Record<string, unknown>;
	const identity = resolveHanziTermIdentity(requestedTerm);

	draft.term = identity.requestedTerm;
	draft.normalizedTerm = identity.canonicalTerm;
	draft.requestedTerm = identity.requestedTerm;
	draft.displayTerm = identity.displayTerm;
	draft.canonicalTerm = identity.canonicalTerm;

	if (Array.isArray(draft.characters)) {
		for (const row of draft.characters as Array<Record<string, unknown>>) {
			const st = row.structureType;
			if (typeof st === 'string' && STRUCTURE_ALIASES[st]) {
				row.structureType = STRUCTURE_ALIASES[st];
			}
		}
	}
	return draft;
}
