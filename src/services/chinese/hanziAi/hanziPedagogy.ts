/** @deprecated Import from hanziTrustPolicy — kept for backward-compatible imports. */
export {
	applyHanziTrustPolicy,
	applyPedagogyPolicy,
	HANZI_PEDAGOGY_PROMPT_VERSION,
	HANZI_TRUST_POLICY_VERSION,
	HANZI_TRUST_PROMPT_VERSION,
	HANZI_TRUST_REGISTRY_VERSION,
	isLegacyPromptVersion,
	isTrustResultStale,
	resultRequiresPedagogyReview,
	resultRequiresTrustReview,
} from './hanziTrustPolicy';

export type { TrustPolicyResult } from './hanziTrustPolicy';
