import { hanziAnalysisResultSchema, type HanziAnalysisResult } from './hanziAnalysisSchema';
import { containsUnsafeAiText } from './hanziNormalization';
import type { HanziKnownFacts, TrustedFact } from './hanziAiTypes';

function expert<T>(fact: TrustedFact<T> | undefined): T | undefined {
	return fact?.trust === 'expert_verified' ? fact.value : undefined;
}

function collectStrings(value: unknown, result: string[] = []): string[] {
	if (typeof value === 'string') result.push(value);
	else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, result));
	else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, result));
	return result;
}

export function validateHanziAnalysis(
	value: unknown,
	term: string,
	knownFacts: HanziKnownFacts,
): { result: HanziAnalysisResult | null; errors: string[]; category: 'content_validation' | 'curated_conflict' } {
	const parsed = hanziAnalysisResultSchema.safeParse(value);
	if (!parsed.success) {
		return {
			result: null,
			errors: parsed.error.issues.slice(0, 12).map((i) => `${i.path.join('.')}: ${i.message}`),
			category: 'content_validation',
		};
	}
	const result = parsed.data;
	const errors: string[] = [];
	let curatedConflict = false;
	const chars = Array.from(term);
	if (result.term !== term) errors.push('term phải giống input');
	if (result.normalizedTerm !== term) errors.push('normalizedTerm phải do server xác định');
	if (result.characters.length !== chars.length) errors.push('characters.length không khớp input');
	chars.forEach((char, position) => {
		const row = result.characters[position];
		if (!row || row.char !== char || row.position !== position) errors.push(`characters[${position}] sai ký tự hoặc position`);
	});
	for (const [index, example] of result.examples.entries()) {
		if (!example.chinese.includes(term)) errors.push(`examples[${index}] phải chứa đúng ${term}`);
	}
	if (collectStrings(result).some(containsUnsafeAiText)) errors.push('output chứa HTML, URL, Markdown hoặc ký tự điều khiển');

	const check = (actual: unknown, expected: unknown, path: string) => {
		if (expected === undefined) return;
		if (JSON.stringify(actual) !== JSON.stringify(expected)) {
			errors.push(`${path} mâu thuẫn dữ liệu expert_verified`);
			curatedConflict = true;
		}
	};
	check(result.pinyin, expert(knownFacts.termLevel.pinyinInContext), 'pinyin');
	check(result.hanViet, expert(knownFacts.termLevel.hanViet), 'hanViet');
	check(result.primaryMeaningVi, expert(knownFacts.termLevel.meaningVi), 'primaryMeaningVi');
	const expectedClasses = expert(knownFacts.termLevel.wordClasses);
	if (expectedClasses && !expectedClasses.every((c) => result.wordClasses.includes(c))) {
		errors.push('wordClasses thiếu dữ liệu expert_verified');
		curatedConflict = true;
	}
	knownFacts.characterLevel.forEach((fact, position) => {
		const row = result.characters[position];
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

	return { result: errors.length ? null : result, errors, category: curatedConflict ? 'curated_conflict' : 'content_validation' };
}

