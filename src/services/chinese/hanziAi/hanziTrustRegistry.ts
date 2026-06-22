import { createHash } from 'crypto';

export const HANZI_TRUST_REGISTRY_VERSION = 1;
export const HANZI_TRUST_POLICY_VERSION = 'hanzi-trust-v1';
export const HANZI_TRUST_PROMPT_VERSION = 'hanzi-v3-trust';

export type ClaimRelation = 'visual' | 'semantic' | 'phonetic';
export type PhoneticKind = 'modern' | 'historical';
export type ClaimTrust = 'curated' | 'expert_verified' | 'unverified';
export type StructureKind =
	| 'pictograph'
	| 'simple_ideograph'
	| 'associative_compound'
	| 'phono_semantic'
	| 'visual_description_only'
	| 'unknown';

export type DecompositionDepthPolicy = 'full' | 'visual_shallow' | 'verified_only' | 'hidden';

export interface CuratedComponentClaim {
	hostChar: string;
	component: string;
	relation: ClaimRelation;
	phoneticKind?: PhoneticKind;
	status: 'expert_verified';
	sourceIds: string[];
	reviewedAt: string;
	reviewedBy: string;
	registryVersion: number;
	scripts?: Array<'simplified' | 'traditional' | 'both'>;
	componentReading?: string;
}

export interface ForbiddenClaim {
	hostChar: string;
	component: string;
	relation: 'semantic' | 'phonetic' | 'ancient_form';
	reason: string;
}

export interface RadicalVariant {
	displayChar: string;
	standardChar: string;
	nameVi: string;
	noteVi: string;
}

export interface CharStructureMeta {
	structureKind: StructureKind;
	phoneticAllowed: boolean;
}

export interface PronunciationInTermEntry {
	hostChar: string;
	termPattern: string;
	dictionaryPinyin: string;
	pinyinInTerm: string;
	toneBehavior: 'neutral_tone' | 'unchanged' | 'unknown';
	status: 'expert_verified';
	sourceIds: string[];
}

const CURATED_CLAIMS: CuratedComponentClaim[] = [
	{ hostChar: '清', component: '青', relation: 'phonetic', phoneticKind: 'modern', componentReading: 'qīng', status: 'expert_verified', sourceIds: ['hanzi-trust:清'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '清', component: '氵', relation: 'semantic', status: 'expert_verified', sourceIds: ['hanzi-trust:清'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '媽', component: '女', relation: 'semantic', status: 'expert_verified', sourceIds: ['hanzi-trust:媽'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '媽', component: '馬', relation: 'phonetic', phoneticKind: 'modern', componentReading: 'mǎ', status: 'expert_verified', sourceIds: ['hanzi-trust:媽'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '楚', component: '疋', relation: 'phonetic', phoneticKind: 'historical', status: 'expert_verified', sourceIds: ['hanzi-trust:楚'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '廢', component: '發', relation: 'phonetic', phoneticKind: 'historical', status: 'expert_verified', sourceIds: ['hanzi-trust:廢'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '忘', component: '亡', relation: 'phonetic', phoneticKind: 'historical', status: 'expert_verified', sourceIds: ['hanzi-trust:忘'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '忘', component: '心', relation: 'semantic', status: 'expert_verified', sourceIds: ['hanzi-trust:忘'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '休', component: '亻', relation: 'semantic', status: 'expert_verified', sourceIds: ['hanzi-trust:休'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '休', component: '木', relation: 'semantic', status: 'expert_verified', sourceIds: ['hanzi-trust:休'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '磨', component: '麻', relation: 'visual', status: 'expert_verified', sourceIds: ['hanzi-trust:磨'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '磨', component: '石', relation: 'semantic', status: 'expert_verified', sourceIds: ['hanzi-trust:磨'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '葡', component: '艹', relation: 'semantic', status: 'expert_verified', sourceIds: ['hanzi-trust:葡'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
	{ hostChar: '萄', component: '艹', relation: 'semantic', status: 'expert_verified', sourceIds: ['hanzi-trust:萄'], reviewedAt: '2026-06-19', reviewedBy: 'curriculum', registryVersion: 1, scripts: ['both'] },
];

export const FORBIDDEN_CLAIMS: ForbiddenClaim[] = [
	{ hostChar: '寢', component: '侵', relation: 'semantic', reason: '侵 không mang nghĩa ngủ' },
	{ hostChar: '寢', component: '侵', relation: 'ancient_form', reason: 'Không được gọi 侵 là dạng cổ của 寢' },
	{ hostChar: '寢', component: '侵', relation: 'phonetic', reason: '侵 không phải thành phần gợi âm của 寢' },
	{ hostChar: '休', component: '木', relation: 'phonetic', reason: '木 không gợi âm xiū trong 休' },
	{ hostChar: '休', component: '亻', relation: 'phonetic', reason: '亻 không gợi âm trong 休' },
];

export const DECOMPOSITION_DEPTH_POLICY: Record<string, DecompositionDepthPolicy> = {
	寢: 'verified_only',
	鬱: 'visual_shallow',
};

export const CHAR_STRUCTURE_META: Record<string, CharStructureMeta> = {
	休: { structureKind: 'associative_compound', phoneticAllowed: false },
	清: { structureKind: 'phono_semantic', phoneticAllowed: true },
	媽: { structureKind: 'phono_semantic', phoneticAllowed: true },
};

export const RADICAL_VARIANTS: Record<string, RadicalVariant> = {
	'亻': { displayChar: '亻', standardChar: '人', nameVi: 'nhân', noteVi: 'Biến thể trái của bộ 人 (214 bộ thủ).' },
	'扌': { displayChar: '扌', standardChar: '手', nameVi: 'thủ', noteVi: 'Biến thể trái của bộ 手 (214 bộ thủ).' },
	'氵': { displayChar: '氵', standardChar: '水', nameVi: 'thủy', noteVi: 'Biến thể trái của bộ 水 (214 bộ thủ).' },
	'飠': { displayChar: '飠', standardChar: '食', nameVi: 'thực', noteVi: 'Biến thể trái của bộ 食 (214 bộ thủ).' },
};

const PRONUNCIATION_IN_TERM: PronunciationInTermEntry[] = [
	{ hostChar: '息', termPattern: '休息', dictionaryPinyin: 'xī', pinyinInTerm: 'xi', toneBehavior: 'neutral_tone', status: 'expert_verified', sourceIds: ['hanzi-trust:休息'] },
	{ hostChar: '休', termPattern: '休息', dictionaryPinyin: 'xiū', pinyinInTerm: 'xiū', toneBehavior: 'unchanged', status: 'expert_verified', sourceIds: ['hanzi-trust:休息'] },
	{ hostChar: '楚', termPattern: '清楚', dictionaryPinyin: 'chǔ', pinyinInTerm: 'chu', toneBehavior: 'neutral_tone', status: 'expert_verified', sourceIds: ['hanzi-trust:清楚'] },
	{ hostChar: '媽', termPattern: '媽媽', dictionaryPinyin: 'mā', pinyinInTerm: 'ma', toneBehavior: 'neutral_tone', status: 'expert_verified', sourceIds: ['hanzi-trust:媽媽'] },
	{ hostChar: '妈', termPattern: '妈妈', dictionaryPinyin: 'mā', pinyinInTerm: 'ma', toneBehavior: 'neutral_tone', status: 'expert_verified', sourceIds: ['hanzi-trust:妈妈'] },
];

function claimKey(hostChar: string, component: string, relation: ClaimRelation): string {
	return `${hostChar}:${component}:${relation}`;
}

const curatedByKey = new Map(CURATED_CLAIMS.map((c) => [claimKey(c.hostChar, c.component, c.relation), c]));

export function lookupCuratedClaim(
	hostChar: string,
	component: string,
	relation: ClaimRelation,
): CuratedComponentClaim | undefined {
	return curatedByKey.get(claimKey(hostChar, component, relation));
}

export function lookupCuratedPhoneticClaim(hostChar: string, component: string): CuratedComponentClaim | undefined {
	return CURATED_CLAIMS.find(
		(c) => c.hostChar === hostChar && c.component === component && c.relation === 'phonetic',
	);
}

export function listCuratedClaimsForChar(hostChar: string): CuratedComponentClaim[] {
	return CURATED_CLAIMS.filter((c) => c.hostChar === hostChar);
}

export function isForbiddenClaim(
	hostChar: string,
	component: string,
	relation: ForbiddenClaim['relation'],
): ForbiddenClaim | undefined {
	return FORBIDDEN_CLAIMS.find(
		(f) => f.hostChar === hostChar && f.component === component && f.relation === relation,
	);
}

export function getDecompositionDepthPolicy(char: string): DecompositionDepthPolicy {
	return DECOMPOSITION_DEPTH_POLICY[char] ?? 'full';
}

export function getCharStructureMeta(char: string): CharStructureMeta | undefined {
	return CHAR_STRUCTURE_META[char];
}

export function getRadicalVariant(displayChar: string): RadicalVariant | undefined {
	return RADICAL_VARIANTS[displayChar];
}

export function lookupPronunciationInTerm(hostChar: string, term: string): PronunciationInTermEntry | undefined {
	return PRONUNCIATION_IN_TERM.find((e) => e.hostChar === hostChar && term.includes(e.termPattern));
}

export function computeTrustContentFingerprint(): string {
	return createHash('sha256')
		.update(JSON.stringify({
			registryVersion: HANZI_TRUST_REGISTRY_VERSION,
			policyVersion: HANZI_TRUST_POLICY_VERSION,
			claimCount: CURATED_CLAIMS.length,
			forbiddenCount: FORBIDDEN_CLAIMS.length,
		}))
		.digest('hex');
}
