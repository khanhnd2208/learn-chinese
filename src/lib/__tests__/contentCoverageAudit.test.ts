/**
 * Static audit of seed content — no DB required.
 * Run: npx vitest run src/lib/__tests__/contentCoverageAudit.test.ts
 */
import { describe, it, expect } from 'vitest';
import { HANZI, WORDS } from '../../../prisma/seed-data/content';
import {
	ALL_SKILL_CHANNELS,
	CHANNEL_TO_GROUP,
	GROUP_QUESTION_MAP,
	wordSupportsQuestionType,
} from '@/lib/chinese/practiceTaxonomy';
import { generateQuestionForWord } from '@/lib/chinese/generateQuestions';
import type { CnQuestionType, CnWordCardDTO } from '@/types/chinese';

const ALL_TYPES: CnQuestionType[] = [
	'hanzi_to_meaning', 'meaning_to_hanzi', 'pinyin_to_hanzi',
	'audio_to_hanzi', 'audio_to_meaning', 'audio_to_pinyin',
	'fill_sentence', 'sentence_order', 'radical_pick', 'char_components', 'similar_char', 'translate_sentence',
];

const hanziMap = new Map(HANZI.map((h) => [h.char, h]));

function parseSamples(raw: string) {
	return raw.split('||').map((part) => {
		const [hanzi = '', pinyin = '', meaningVi = ''] = part.split('|').map((s) => s.trim());
		return { hanzi, pinyin, meaningVi };
	}).filter((s) => s.hanzi);
}

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
			status: 'published' as const,
			position,
		};
	});
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
		examples: w.example ? [{ id: 'e1', ...w.example }] : [],
		patterns: w.pattern ? [{ id: 'p1', template: w.pattern.template, samples: parseSamples(w.pattern.samples) }] : [],
		chars,
		relatedWords: [],
	};
}

function exampleContainsWord(card: CnWordCardDTO): boolean {
	const ex = card.examples[0]?.hanzi ?? '';
	return ex.includes(card.simplified);
}

describe('seed content coverage audit', () => {
	const cards = WORDS.map(seedToCard);
	const pool = cards;
	const total = cards.length;

	it(`seed has ${total} words`, () => {
		expect(total).toBeGreaterThanOrEqual(50);
	});

	const perType: Record<string, { support: number; generate: number }> = {};
	for (const t of ALL_TYPES) {
		perType[t] = { support: 0, generate: 0 };
		for (const card of cards) {
			if (wordSupportsQuestionType(card, t)) perType[t].support++;
			if (wordSupportsQuestionType(card, t) && generateQuestionForWord(card, pool, t, 0)) {
				perType[t].generate++;
			}
		}
	}

	it('core_vocab + listening: 100% words have data support', () => {
		for (const t of [...GROUP_QUESTION_MAP.core_vocab, ...GROUP_QUESTION_MAP.listening]) {
			expect(perType[t].support).toBe(total);
			expect(perType[t].generate).toBe(total);
		}
	});

	it('sentence_usage: all words support fill_sentence when example contains word', () => {
		expect(perType.fill_sentence.support).toBe(total);
	});

	it('similar_char only covers words in similar groups (~12 words)', () => {
		const similarWords = cards.filter((c) => c.chars.some((ch) => ch.similarGroupId));
		expect(perType.similar_char.support).toBe(similarWords.length);
		expect(similarWords.length).toBeGreaterThanOrEqual(8);
		expect(perType.similar_char.support / total).toBeLessThan(0.25);
	});

	it('char_components fails for chars with empty components list', () => {
		const noComponents = cards.filter((c) => !c.chars.some((ch) => ch.components.length > 0));
		expect(noComponents.length).toBeGreaterThan(0);
		expect(perType.char_components.support).toBe(total - noComponents.length);
	});

	it('fill_sentence: every supported word must have example containing the word (CI guard)', () => {
		const brokenFill = cards.filter(
			(c) => wordSupportsQuestionType(c, 'fill_sentence') && !exampleContainsWord(c),
		);
		expect(brokenFill.map((c) => c.simplified)).toEqual([]);
	});

	it('all words with examples must contain simplified in example hanzi (CI guard)', () => {
		const brokenExamples = cards.filter(
			(c) => c.examples[0]?.hanzi && !c.examples[0].hanzi.includes(c.simplified),
		);
		expect(brokenExamples.map((c) => c.simplified)).toEqual([]);
	});

	it('per-channel SRS review coverage at strong stage', () => {
		const channelStats: Record<string, { anyGenerate: number }> = {};
		for (const ch of ALL_SKILL_CHANNELS) {
			const group = CHANNEL_TO_GROUP[ch];
			const types = GROUP_QUESTION_MAP[group];
			let anyGenerate = 0;
			for (const card of cards) {
				if (types.some((t) => wordSupportsQuestionType(card, t) && generateQuestionForWord(card, pool, t, 0))) {
					anyGenerate++;
				}
			}
			channelStats[ch] = { anyGenerate };
		}
		// meaning/listening/pinyin: all words
		expect(channelStats.meaning.anyGenerate).toBe(total);
		expect(channelStats.listening.anyGenerate).toBe(total);
		expect(channelStats.pinyin.anyGenerate).toBe(total);
		// sentence: all (data gate passes, even if fill broken)
		expect(channelStats.sentence.anyGenerate).toBe(total);
		// hanzi: only words with radical/components/similar
		expect(channelStats.hanzi.anyGenerate).toBeGreaterThan(total * 0.7);
	});

	// Log summary for manual inspection
	it('prints coverage summary', () => {
		const summary = Object.fromEntries(ALL_TYPES.map((t) => [t, {
			supportPct: Math.round((perType[t].support / total) * 100),
			generatePct: Math.round((perType[t].generate / total) * 100),
		}]));
		console.log('SEED COVERAGE:', JSON.stringify(summary, null, 2));
		expect(summary).toBeDefined();
	});
});
