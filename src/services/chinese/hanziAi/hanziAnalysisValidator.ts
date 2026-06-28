import { hanziAnalysisResultSchema, type HanziAiDraftResult } from './hanziAnalysisSchema';
import { containsUnsafeAiText } from './hanziNormalization';
import { preNormalizeAiDraft } from './hanziPreNormalize';
import { parseHanziDraft } from './hanziSchemaRegistry';
import { applyHanziTrustPolicy } from './hanziTrustPolicy';
import {
	containsAncientFormLanguage,
	containsUnverifiedPhoneticLanguage,
} from './hanziClaimTemplates';
import {
	FORBIDDEN_CLAIMS,
	isForbiddenClaim,
} from './hanziTrustRegistry';
import { resolveHanziTermIdentity } from './hanziTermIdentity';
import type { HanziKnownFacts, TrustedFact } from './hanziAiTypes';

export {
	applyHanziTrustPolicy,
	resultRequiresTrustReview,
	resultRequiresPedagogyReview,
	applyPedagogyPolicy,
	isLegacyPromptVersion,
	isTrustResultStale,
	HANZI_TRUST_PROMPT_VERSION,
	HANZI_TRUST_POLICY_VERSION,
	HANZI_TRUST_REGISTRY_VERSION,
} from './hanziTrustPolicy';

function expert<T>(fact: TrustedFact<T> | undefined): T | undefined {
	return fact?.trust === 'expert_verified' ? fact.value : undefined;
}

function collectStrings(value: unknown, result: string[] = []): string[] {
	if (typeof value === 'string') result.push(value);
	else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, result));
	else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, result));
	return result;
}

function validateDraftContent(draft: HanziAiDraftResult, term: string): { errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	const identity = resolveHanziTermIdentity(term);
	if (draft.term !== identity.requestedTerm) errors.push('term phải giống input');

	for (const row of draft.characters) {
		for (const c of row.components) {
			if (c.role === 'phonetic') {
				errors.push(`characters[${row.position}].components: AI không được gán role=phonetic trực tiếp`);
			}
			for (const rule of FORBIDDEN_CLAIMS) {
				if (rule.hostChar !== row.char || rule.component !== c.char) continue;
				if (rule.relation === 'semantic' && c.role === 'semantic') errors.push(rule.reason);
				if (rule.relation === 'phonetic' && /phonetic|gợi âm/i.test(c.explanationVi)) errors.push(rule.reason);
			}
		}
		if (containsUnverifiedPhoneticLanguage(row.structureExplanationVi)) {
			errors.push(`characters[${row.position}].structureExplanationVi chứa ngôn ngữ gợi âm chưa xác minh`);
		}
		if (row.etymologyNoteVi && containsUnverifiedPhoneticLanguage(row.etymologyNoteVi)) {
			errors.push(`characters[${row.position}].etymologyNoteVi chứa ngôn ngữ gợi âm chưa xác minh`);
		}
		for (const c of row.components) {
			if (isForbiddenClaim(row.char, c.char, 'semantic') && c.role === 'semantic') {
				errors.push(isForbiddenClaim(row.char, c.char, 'semantic')!.reason);
			}
			if (containsAncientFormLanguage(c.explanationVi)) {
				errors.push(`characters[${row.position}].components: cấm mô tả dạng cổ không xác minh`);
			}
		}
	}

	const charMeanings = new Set(draft.characters.map((c) => c.meaningVi.toLowerCase()));
	const overlap = draft.otherMeaningsVi.filter((m) => charMeanings.has(m.toLowerCase()));
	if (overlap.length) {
		warnings.push(`otherMeaningsVi có thể trùng nghĩa thành phần (${overlap.join(', ')}) — cần kiểm tra`);
	}

	return { errors, warnings };
}

export function validateHanziAnalysis(
	value: unknown,
	term: string,
	knownFacts: HanziKnownFacts,
): { result: ReturnType<typeof applyHanziTrustPolicy>['result'] | null; errors: string[]; category: 'content_validation' | 'curated_conflict' } {
	const normalized = preNormalizeAiDraft(value, term);
	const parsed = parseHanziDraft(normalized);
	if (!parsed.ok) {
		return { result: null, errors: parsed.errors, category: 'content_validation' };
	}
	const draft = parsed.data;
	const errors: string[] = [];
	let curatedConflict = false;
	const chars = Array.from(term);

	if (draft.characters.length !== chars.length) errors.push('characters.length không khớp input');
	chars.forEach((char, position) => {
		const row = draft.characters[position];
		if (!row || row.char !== char || row.position !== position) errors.push(`characters[${position}] sai ký tự hoặc position`);
	});
	for (const [index, example] of draft.examples.entries()) {
		if (!example.chinese.includes(term)) errors.push(`examples[${index}] phải chứa đúng ${term}`);
	}
	if (collectStrings(draft).some(containsUnsafeAiText)) errors.push('output chứa HTML, URL, Markdown hoặc ký tự điều khiển');

	const { errors: draftErrors, warnings: draftWarnings } = validateDraftContent(draft, term);
	errors.push(...draftErrors);

	const check = (actual: unknown, expected: unknown, path: string) => {
		if (expected === undefined) return;
		if (JSON.stringify(actual) !== JSON.stringify(expected)) {
			errors.push(`${path} mâu thuẫn dữ liệu expert_verified`);
			curatedConflict = true;
		}
	};
	check(draft.pinyin, expert(knownFacts.termLevel.pinyinInContext), 'pinyin');
	check(draft.hanViet, expert(knownFacts.termLevel.hanViet), 'hanViet');
	check(draft.primaryMeaningVi, expert(knownFacts.termLevel.meaningVi), 'primaryMeaningVi');
	const expectedClasses = expert(knownFacts.termLevel.wordClasses);
	if (expectedClasses && !expectedClasses.every((c) => draft.wordClasses.includes(c))) {
		errors.push('wordClasses thiếu dữ liệu expert_verified');
		curatedConflict = true;
	}
	knownFacts.characterLevel.forEach((fact, position) => {
		const row = draft.characters[position];
		if (!row) return;
		const readings = expert(fact.dictionaryReadings);
		if (readings && !readings.every((r) => row.dictionaryReadings.includes(r))) {
			errors.push(`characters[${position}].dictionaryReadings mâu thuẫn dữ liệu expert_verified`);
			curatedConflict = true;
		}
		check(row.hanViet, expert(fact.hanViet), `characters[${position}].hanViet`);
		check(row.meaningVi, expert(fact.meaningVi), `characters[${position}].meaningVi`);
		const radical = expert(fact.radical);
		check(row.radical?.char ?? null, radical, `characters[${position}].radical`);
		const components = expert(fact.components);
		check(row.components.map((c) => c.char), components, `characters[${position}].components`);
	});

	if (errors.length) {
		return { result: null, errors, category: curatedConflict ? 'curated_conflict' : 'content_validation' };
	}

	const { result } = applyHanziTrustPolicy(draft, term, knownFacts);
	if (draftWarnings.length) {
		result.warnings = [...result.warnings, ...draftWarnings];
	}
	const finalParsed = hanziAnalysisResultSchema.safeParse(result);
	if (!finalParsed.success) {
		return {
			result: null,
			errors: finalParsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`),
			category: 'content_validation',
		};
	}
	return { result: finalParsed.data, errors: [], category: 'content_validation' };
}
