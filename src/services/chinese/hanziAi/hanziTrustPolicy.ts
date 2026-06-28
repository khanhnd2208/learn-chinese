import type {
	HanziAiDraftResult,
	HanziAnalysisResult,
	HanziCharacterAnalysis,
	HanziComponentAnalysis,
} from './hanziAnalysisSchema';
import type { HanziKnownFacts } from './hanziAiTypes';
import {
	buildPhoneticPublishExplanation,
	buildSemanticPublishExplanation,
	buildVisualPublishExplanation,
	containsAncientFormLanguage,
	DECOMPOSITION_UNAVAILABLE_MESSAGE,
	DECOMPOSITION_VISUAL_ONLY_NOTE,
} from './hanziClaimTemplates';
import { resolveHanziTermIdentity } from './hanziTermIdentity';
import {
	type ClaimRelation,
	type ClaimTrust,
	FORBIDDEN_CLAIMS,
	getCharStructureMeta,
	getDecompositionDepthPolicy,
	getRadicalVariant,
	HANZI_TRUST_POLICY_VERSION,
	HANZI_TRUST_PROMPT_VERSION,
	HANZI_TRUST_REGISTRY_VERSION,
	isForbiddenClaim,
	listCuratedClaimsForChar,
	lookupCuratedClaim,
	lookupPronunciationInTerm,
} from './hanziTrustRegistry';

export { HANZI_TRUST_PROMPT_VERSION, HANZI_TRUST_POLICY_VERSION, HANZI_TRUST_REGISTRY_VERSION };

export interface TrustPolicyResult {
	result: HanziAnalysisResult;
	trustWarnings: string[];
}

function inferRelationFromDraftRole(
	role: HanziAiDraftResult['characters'][0]['components'][0]['role'],
): ClaimRelation {
	if (role === 'semantic' || role === 'radical') return 'semantic';
	if (role === 'phonetic') return 'phonetic';
	return 'visual';
}

function resolveClaimTrust(
	hostChar: string,
	component: string,
	relation: ClaimRelation,
	knownFacts: HanziKnownFacts,
	position: number,
): ClaimTrust {
	const curated = lookupCuratedClaim(hostChar, component, relation);
	if (curated) return 'curated';
	const charFact = knownFacts.characterLevel.find((f) => f.position === position);
	const expertComponents = charFact?.components?.trust === 'expert_verified'
		? charFact.components.value
		: undefined;
	if (expertComponents?.includes(component)) return 'expert_verified';
	return 'unverified';
}

function deriveUiRole(relation: ClaimRelation, claimTrust: ClaimTrust): HanziComponentAnalysis['role'] {
	if (claimTrust === 'unverified') return relation === 'semantic' ? 'form' : 'form';
	if (relation === 'phonetic') return 'phonetic';
	if (relation === 'semantic') return 'semantic';
	return 'form';
}

function buildPublishExplanation(
	hostChar: string,
	component: string,
	relation: ClaimRelation,
	claimTrust: ClaimTrust,
	meaningVi: string | null,
	curatedPhoneticKind?: 'modern' | 'historical',
	componentReading?: string,
): string | null {
	if (claimTrust === 'unverified') return null;
	if (relation === 'phonetic' && curatedPhoneticKind) {
		return buildPhoneticPublishExplanation(component, hostChar, curatedPhoneticKind, componentReading);
	}
	if (relation === 'semantic') return buildSemanticPublishExplanation(component, meaningVi);
	return buildVisualPublishExplanation(component, hostChar);
}

function detectForbiddenInText(hostChar: string, text: string): string[] {
	const hits: string[] = [];
	for (const rule of FORBIDDEN_CLAIMS) {
		if (rule.hostChar !== hostChar) continue;
		if (!text.includes(rule.component)) continue;
		if (rule.relation === 'semantic' && /nghĩa|ngủ|semantic|gợi nghĩa/i.test(text)) hits.push(rule.reason);
		if (rule.relation === 'ancient_form' && /dạng cổ|ancient|thiếu bộ/i.test(text)) hits.push(rule.reason);
		if (rule.relation === 'phonetic' && /gợi âm|phonetic|âm/i.test(text)) hits.push(rule.reason);
	}
	return hits;
}

function computeCharDisplayMode(
	hostChar: string,
	components: HanziComponentAnalysis[],
	forbiddenViolations: boolean,
): HanziCharacterAnalysis['decompositionDisplayMode'] {
	const depth = getDecompositionDepthPolicy(hostChar);
	if (forbiddenViolations) return 'hidden';
	if (depth === 'verified_only') {
		const hasVerified = components.some((c) => c.claimTrust !== 'unverified');
		return hasVerified ? 'full' : 'hidden';
	}
	if (depth === 'visual_shallow') {
		const hasVisual = components.some((c) => c.relation === 'visual' || c.claimTrust !== 'unverified');
		return hasVisual ? 'visual_only' : 'hidden';
	}
	const verifiedCount = components.filter((c) => c.claimTrust !== 'unverified').length;
	if (verifiedCount === 0 && components.length > 0) return 'visual_only';
	if (verifiedCount > 0) return 'full';
	return 'hidden';
}

function aggregateDecompositionStatus(
	modes: HanziCharacterAnalysis['decompositionDisplayMode'][],
): HanziAnalysisResult['decompositionStatus'] {
	if (modes.every((m) => m === 'hidden')) return 'hidden';
	if (modes.every((m) => m === 'full')) return 'full';
	return 'visual_only';
}

function enrichRadical(
	radical: HanziAiDraftResult['characters'][0]['radical'],
): HanziCharacterAnalysis['radical'] {
	if (!radical) return null;
	const variant = getRadicalVariant(radical.char);
	return {
		...radical,
		standardChar: variant?.standardChar ?? null,
		variantNoteVi: variant?.noteVi ?? null,
	};
}

export function applyHanziTrustPolicy(
	draft: HanziAiDraftResult,
	requestedTerm: string,
	knownFacts: HanziKnownFacts,
): TrustPolicyResult {
	const identity = resolveHanziTermIdentity(requestedTerm);
	const trustWarnings: string[] = [];
	const nextChars: HanziCharacterAnalysis[] = [];

	for (const row of draft.characters) {
		const depth = getDecompositionDepthPolicy(row.char);
		const structureMeta = getCharStructureMeta(row.char);
		let hardForbidden = false;
		const pronunciation = lookupPronunciationInTerm(row.char, identity.canonicalTerm);

		const curatedForChar = listCuratedClaimsForChar(row.char);
		const draftComponents = depth === 'verified_only'
			? []
			: row.components.filter((c) => {
				let drop = false;
				for (const rel of ['semantic', 'phonetic', 'ancient_form'] as const) {
					const rule = isForbiddenClaim(row.char, c.char, rel);
					if (!rule) continue;
					const makesSemanticClaim = c.role === 'semantic' || c.role === 'radical';
					const makesPhoneticClaim = c.role === 'phonetic'
						|| /gợi âm|phonetic|âm gần|đọc gần|biến âm/i.test(c.explanationVi);
					const makesAncientClaim = containsAncientFormLanguage(c.explanationVi);
					if (rel === 'semantic' && makesSemanticClaim) {
						hardForbidden = true;
						trustWarnings.push(rule.reason);
						drop = true;
					}
					if (rel === 'phonetic' && makesPhoneticClaim) {
						trustWarnings.push(rule.reason);
					}
					if (rel === 'ancient_form' && makesAncientClaim) {
						hardForbidden = true;
						trustWarnings.push(rule.reason);
						drop = true;
					}
				}
				return !drop;
			});

		const components: HanziComponentAnalysis[] = [];

		if (depth === 'verified_only') {
			for (const curated of curatedForChar) {
				const claimTrust: ClaimTrust = 'curated';
				components.push({
					char: curated.component,
					position: components.length,
					relation: curated.relation,
					role: deriveUiRole(curated.relation, claimTrust),
					phoneticKind: curated.phoneticKind ?? null,
					claimTrust,
					publishExplanationVi: buildPublishExplanation(
						row.char, curated.component, curated.relation, claimTrust,
						null, curated.phoneticKind, curated.componentReading,
					),
					meaningVi: curated.relation === 'semantic' ? row.components.find((c) => c.char === curated.component)?.meaningVi ?? null : null,
					explanationVi: row.components.find((c) => c.char === curated.component)?.explanationVi ?? 'Thành phần đã kiểm chứng.',
					isMainRadical: row.radical?.char === curated.component,
				});
			}
		} else {
			for (const c of draftComponents) {
				let relation = inferRelationFromDraftRole(c.role);
				const curated = lookupCuratedClaim(row.char, c.char, relation)
					?? lookupCuratedClaim(row.char, c.char, 'phonetic')
					?? lookupCuratedClaim(row.char, c.char, 'semantic')
					?? lookupCuratedClaim(row.char, c.char, 'visual');
				if (curated) relation = curated.relation;

				if (c.role === 'phonetic' || relation === 'phonetic') {
					if (!structureMeta?.phoneticAllowed && !lookupCuratedClaim(row.char, c.char, 'phonetic')) {
						relation = 'visual';
					}
				}

				const claimTrust = curated
					? 'curated'
					: resolveClaimTrust(row.char, c.char, relation, knownFacts, row.position);

				if (relation === 'phonetic' && claimTrust === 'unverified') {
					relation = 'visual';
				}

				const curatedPhonetic = lookupCuratedClaim(row.char, c.char, 'phonetic');
				components.push({
					char: c.char,
					position: c.position,
					relation,
					role: deriveUiRole(relation, claimTrust === 'unverified' ? 'unverified' : claimTrust),
					phoneticKind: curatedPhonetic?.phoneticKind ?? (relation === 'phonetic' && claimTrust !== 'unverified' ? curated?.phoneticKind ?? null : null),
					claimTrust: relation === 'phonetic' && claimTrust !== 'unverified' ? claimTrust : claimTrust,
					publishExplanationVi: buildPublishExplanation(
						row.char, c.char, relation,
						relation === 'phonetic' && claimTrust === 'unverified' ? 'unverified' : claimTrust,
						c.meaningVi,
						curatedPhonetic?.phoneticKind ?? curated?.phoneticKind,
						curatedPhonetic?.componentReading ?? curated?.componentReading,
					),
					meaningVi: c.meaningVi,
					explanationVi: c.explanationVi,
					isMainRadical: c.isMainRadical,
				});
			}
		}

		for (const text of [row.structureExplanationVi, row.etymologyNoteVi ?? '', row.mnemonicVi ?? '']) {
			const hits = detectForbiddenInText(row.char, text);
			if (hits.length) {
				trustWarnings.push(...hits);
				if (hits.some((h) => !/gợi âm|âm/i.test(h) || /ngủ|dạng cổ/i.test(h))) {
					hardForbidden = true;
				}
			}
		}

		const displayMode = computeCharDisplayMode(row.char, components, hardForbidden);
		let structureExplanationVi = row.structureExplanationVi;
		if (displayMode === 'hidden') {
			structureExplanationVi = DECOMPOSITION_UNAVAILABLE_MESSAGE;
		} else if (displayMode === 'visual_only') {
			structureExplanationVi = `${row.structureExplanationVi.split('.')[0]}. ${DECOMPOSITION_VISUAL_ONLY_NOTE}`;
		}

		nextChars.push({
			...row,
			radical: enrichRadical(row.radical),
			structureKind: structureMeta?.structureKind ?? 'unknown',
			pinyinInTerm: pronunciation?.pinyinInTerm ?? null,
			toneBehavior: pronunciation?.toneBehavior ?? null,
			decompositionDisplayMode: displayMode,
			components: displayMode === 'hidden' ? [] : components,
			structureExplanationVi,
			etymologyNoteVi: displayMode === 'full' ? row.etymologyNoteVi : null,
			etymologyStatus: displayMode === 'full' && row.etymologyStatus === 'supported' ? 'supported' : 'not_provided',
		});
	}

	const decompositionStatus = aggregateDecompositionStatus(nextChars.map((c) => c.decompositionDisplayMode));
	const lexicalStatus: HanziAnalysisResult['lexicalStatus'] = 'ready';
	const exampleStatus: HanziAnalysisResult['exampleStatus'] =
		draft.examples.length > 0 ? 'ready' : 'needs_review';

	const result: HanziAnalysisResult = {
		schemaVersion: 2,
		policyVersion: HANZI_TRUST_POLICY_VERSION,
		registryVersion: HANZI_TRUST_REGISTRY_VERSION,
		requestedTerm: identity.requestedTerm,
		displayTerm: identity.displayTerm,
		canonicalTerm: identity.canonicalTerm,
		term: identity.displayTerm,
		normalizedTerm: identity.canonicalTerm,
		script: draft.script,
		simplified: draft.simplified,
		traditional: draft.traditional,
		pinyin: draft.pinyin,
		hanViet: draft.hanViet,
		primaryMeaningVi: draft.primaryMeaningVi,
		otherMeaningsVi: draft.otherMeaningsVi,
		wordClasses: draft.wordClasses,
		usageNoteVi: draft.usageNoteVi,
		overallExplanationVi: draft.overallExplanationVi,
		overallMnemonicVi: draft.overallMnemonicVi,
		lexicalStatus,
		decompositionStatus,
		exampleStatus,
		characters: nextChars,
		examples: draft.examples,
		warnings: [...draft.warnings, ...trustWarnings.slice(0, 5)],
	};

	return { result, trustWarnings };
}

export function resultRequiresTrustReview(result: HanziAnalysisResult): boolean {
	return result.lexicalStatus === 'needs_review'
		|| result.exampleStatus === 'needs_review'
		|| result.decompositionStatus === 'hidden';
}

export function isLegacyPromptVersion(promptVersion: string | null | undefined): boolean {
	if (!promptVersion) return true;
	return promptVersion !== HANZI_TRUST_PROMPT_VERSION && !promptVersion.startsWith('hanzi-v3');
}

export function isTrustResultStale(result: HanziAnalysisResult): boolean {
	return result.schemaVersion !== 2
		|| result.policyVersion !== HANZI_TRUST_POLICY_VERSION
		|| result.registryVersion !== HANZI_TRUST_REGISTRY_VERSION;
}

/** @deprecated use applyHanziTrustPolicy */
export function applyPedagogyPolicy(
	draft: HanziAiDraftResult,
	knownFacts: HanziKnownFacts,
	requestedTerm: string,
): { result: HanziAnalysisResult; requiresReview: boolean; pedagogyWarnings: string[] } {
	const { result, trustWarnings } = applyHanziTrustPolicy(draft, requestedTerm, knownFacts);
	return {
		result,
		requiresReview: resultRequiresTrustReview(result),
		pedagogyWarnings: trustWarnings,
	};
}

export function resultRequiresPedagogyReview(result: HanziAnalysisResult, knownFacts: HanziKnownFacts): boolean {
	void knownFacts;
	return resultRequiresTrustReview(result);
}

export const HANZI_PEDAGOGY_PROMPT_VERSION = HANZI_TRUST_PROMPT_VERSION;
