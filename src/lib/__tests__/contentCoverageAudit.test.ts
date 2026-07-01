/**
 * Static audit of seed content — no DB required.
 */
import { describe, it, expect } from 'vitest';
import { HANZI, WORDS } from '../../../prisma/seed-data/content';
import { CORE_QUESTION_TYPES } from '@/lib/chinese/coreQuestionTypes';
import {
	ALL_SKILL_CHANNELS,
	CHANNEL_TO_GROUP,
	GROUP_QUESTION_MAP,
	wordSupportsQuestionType,
} from '@/lib/chinese/practiceTaxonomy';
import { generateQuestionForWord } from '@/lib/chinese/generateQuestions';
import type { CnQuestionType, CnWordCardDTO } from '@/types/chinese';

const hanziMap = new Map(HANZI.map((h) => [h.char, h]));

function seedToCard(w: (typeof WORDS)[0]): CnWordCardDTO {
	const chars = w.chars.map((ch, position) => {
		const h = hanziMap.get(ch)!;
		return {
			id: `h-${ch}`,
			char: ch,
			pinyin: h.pinyin,
			hanViet: h.hanViet,
			meaningVi: h.meaningVi,
			components: h.components,
			radical: h.radical,
			mnemonicVi: h.mnemonicVi,
			similarGroupId: h.similarGroupKey ? `sg-${h.similarGroupKey}` : null,
			componentAnalysisStatus: 'basic',
			status: 'published' as const,
			position,
		};
	});

	const example = w.example
		? {
			id: 'e1',
			...w.example,
			targetWordStart: w.example.hanzi.indexOf(w.simplified),
			targetWordEnd: w.example.hanzi.indexOf(w.simplified) + w.simplified.length,
			naturalnessStatus: w.example.hanzi.includes(w.simplified) ? 'verified' as const : 'draft' as const,
		}
		: null;

	return {
		id: `w-${w.simplified}`,
		simplified: w.simplified,
		pinyin: w.pinyin,
		hanViet: w.hanViet,
		meaningVi: w.meaningVi,
		partOfSpeech: w.partOfSpeech,
		mnemonicVi: w.mnemonicVi,
		hskLevel: w.hskLevel,
		status: 'published',
		examples: example ? [example] : [],
		patterns: [],
		chars,
		relatedWords: [],
	};
}

describe('seed content coverage audit (6 core types)', () => {
	const cards = WORDS.map(seedToCard);
	const pool = cards;
	const total = cards.length;

	it(`seed has ${total} words`, () => {
		expect(total).toBeGreaterThanOrEqual(50);
	});

	it('every channel maps to core question types', () => {
		for (const ch of ALL_SKILL_CHANNELS) {
			const group = CHANNEL_TO_GROUP[ch];
			for (const t of GROUP_QUESTION_MAP[group]) {
				expect(CORE_QUESTION_TYPES).toContain(t);
			}
		}
	});

	it('core vocab types generate for most seed words', () => {
		const coreTypes: CnQuestionType[] = ['hanzi_to_meaning', 'meaning_to_hanzi', 'sound_to_hanzi'];
		for (const type of coreTypes) {
			const supported = cards.filter((c) => wordSupportsQuestionType(c, type)).length;
			expect(supported).toBeGreaterThan(total * 0.95);
			const generated = cards.filter((c, i) => generateQuestionForWord(c, pool, type, i));
			expect(generated.length).toBeGreaterThan(total * 0.9);
		}
	});

	it('typed recall types generate for most seed words', () => {
		const typedTypes: CnQuestionType[] = ['meaning_to_hanzi_typed', 'sound_to_hanzi_typed'];
		for (const type of typedTypes) {
			const supported = cards.filter((c) => wordSupportsQuestionType(c, type)).length;
			expect(supported).toBeGreaterThan(total * 0.95);
			const generated = cards.filter((c, i) => generateQuestionForWord(c, pool, type, i));
			expect(generated.length).toBeGreaterThan(total * 0.9);
		}
	});
});
