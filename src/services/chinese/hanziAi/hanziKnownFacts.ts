import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cleanSafeText } from './hanziNormalization';
import type { FactTrust, HanziKnownFacts, TrustedFact } from './hanziAiTypes';

type DbClient = typeof prisma | Prisma.TransactionClient;

const WORD_FIELDS = new Set(['pinyin', 'hanViet', 'meaningVi', 'partOfSpeech']);
const HANZI_FIELDS = new Set(['pinyin', 'hanViet', 'meaningVi', 'radical', 'components']);

function trustFor(field: string, system: string[], expert: string[], allowlist: Set<string>): FactTrust {
	if (!allowlist.has(field)) return 'unverified';
	if (expert.includes(field)) return 'expert_verified';
	if (system.includes(field)) return 'system_checked';
	return 'unverified';
}

function textFact(
	value: string,
	field: string,
	system: string[],
	expert: string[],
	allowlist: Set<string>,
): TrustedFact<string> | undefined {
	const safe = cleanSafeText(value, 300);
	return safe ? { value: safe, trust: trustFor(field, system, expert, allowlist) } : undefined;
}

function arrayFact(
	values: string[],
	field: string,
	system: string[],
	expert: string[],
): TrustedFact<string[]> | undefined {
	const safe = values.map((v) => cleanSafeText(v, 40)).filter((v): v is string => !!v);
	if (!safe.length || safe.length !== values.length) return undefined;
	return { value: safe, trust: trustFor(field, system, expert, HANZI_FIELDS) };
}

export async function loadHanziKnownFacts(
	term: string,
	db: DbClient = prisma,
): Promise<{
	facts: HanziKnownFacts;
	dependencies: Array<{ sourceType: 'word' | 'hanzi'; sourceId: string }>;
}> {
	const chars = Array.from(term);
	const [word, hanzi] = await Promise.all([
		db.cnWord.findFirst({ where: { simplified: term, status: 'published' } }),
		db.cnHanzi.findMany({ where: { char: { in: chars }, status: 'published' } }),
	]);
	const hanziMap = new Map(hanzi.map((h) => [h.char, h]));
	const dependencies: Array<{ sourceType: 'word' | 'hanzi'; sourceId: string }> = [];

	const termLevel: HanziKnownFacts['termLevel'] = {};
	if (word) {
		dependencies.push({ sourceType: 'word', sourceId: word.id });
		termLevel.pinyinInContext = textFact(word.pinyin, 'pinyin', word.systemCheckedFields, word.expertVerifiedFields, WORD_FIELDS);
		termLevel.hanViet = textFact(word.hanViet, 'hanViet', word.systemCheckedFields, word.expertVerifiedFields, WORD_FIELDS);
		termLevel.meaningVi = textFact(word.meaningVi, 'meaningVi', word.systemCheckedFields, word.expertVerifiedFields, WORD_FIELDS);
		const wordClass = cleanSafeText(word.partOfSpeech, 80);
		if (wordClass) {
			termLevel.wordClasses = {
				value: [wordClass],
				trust: trustFor('partOfSpeech', word.systemCheckedFields, word.expertVerifiedFields, WORD_FIELDS),
			};
		}
	}

	const characterLevel = chars.map((char, position) => {
		const row = hanziMap.get(char);
		if (!row) return { char, position };
		dependencies.push({ sourceType: 'hanzi', sourceId: row.id });
		const reading = textFact(row.pinyin, 'pinyin', row.systemCheckedFields, row.expertVerifiedFields, HANZI_FIELDS);
		return {
			char,
			position,
			dictionaryReadings: reading ? { ...reading, value: [reading.value] } : undefined,
			hanViet: textFact(row.hanViet, 'hanViet', row.systemCheckedFields, row.expertVerifiedFields, HANZI_FIELDS),
			meaningVi: textFact(row.meaningVi, 'meaningVi', row.systemCheckedFields, row.expertVerifiedFields, HANZI_FIELDS),
			radical: textFact(row.radical, 'radical', row.systemCheckedFields, row.expertVerifiedFields, HANZI_FIELDS),
			components: arrayFact(row.components, 'components', row.systemCheckedFields, row.expertVerifiedFields),
		};
	});

	return { facts: { termLevel, characterLevel }, dependencies };
}

function canonicalize(value: unknown, path = ''): unknown {
	if (Array.isArray(value)) {
		const values = value.map((item) => canonicalize(item, path));
		if (path.endsWith('dictionaryReadings.value') || path.endsWith('wordClasses.value')) {
			return [...new Set(values.map((item) => JSON.stringify(item)))].sort().map((item) => JSON.parse(item));
		}
		return values;
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.filter(([, v]) => v !== undefined)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => [k, canonicalize(v, path ? `${path}.${k}` : k)]),
		);
	}
	if (typeof value === 'string') return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
	return value;
}

function onlyHardFacts(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(onlyHardFacts).filter((v) => v !== undefined);
	if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		if ('trust' in obj && obj.trust !== 'expert_verified') return undefined;
		return Object.fromEntries(
			Object.entries(obj)
				.map(([k, v]) => [k, onlyHardFacts(v)] as const)
				.filter(([, v]) => v !== undefined),
		);
	}
	return value;
}

export function hashKnownFacts(facts: HanziKnownFacts): { hardFactsHash: string; allFactsHash: string } {
	const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
	return {
		hardFactsHash: digest(onlyHardFacts(facts)),
		allFactsHash: digest(facts),
	};
}
