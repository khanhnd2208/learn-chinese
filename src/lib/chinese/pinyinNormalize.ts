/* ════════════════════════════════════════════════════════════════════════
   pinyinNormalize.ts — Pinyin normalization helpers for distractors/backfill
   ════════════════════════════════════════════════════════════════════════ */

const TONE_MARKS: Record<string, string> = {
	ā: 'a', á: 'a', ǎ: 'a', à: 'a',
	ē: 'e', é: 'e', ě: 'e', è: 'e',
	ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
	ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
	ū: 'u', ú: 'u', ǔ: 'u', ù: 'u',
	ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v', ü: 'v',
};

const TONE_NUMBER_SUFFIX = /([1-5])$/;

function stripDiacritics(input: string): string {
	let out = '';
	for (const ch of input) {
		out += TONE_MARKS[ch] ?? ch;
	}
	return out;
}

/** Plain syllable: lowercase, no tones, ü→v */
export function normalizePinyinPlain(input: string): string {
	return stripDiacritics(input.toLowerCase())
		.replace(/u:/g, 'v')
		.replace(/ü/g, 'v')
		.replace(/[^a-z0-9]/g, '');
}

function splitCanonicalSyllables(pinyin: string): string[] {
	const trimmed = pinyin.trim();
	if (!trimmed) return [];
	return trimmed.split(/[\s]+/).filter(Boolean);
}

function inferToneNumber(syllable: string): string | null {
	for (const ch of syllable) {
		if (ch === 'ā' || ch === 'ē' || ch === 'ī' || ch === 'ō' || ch === 'ū' || ch === 'ǖ') return '1';
		if (ch === 'á' || ch === 'é' || ch === 'í' || ch === 'ó' || ch === 'ú' || ch === 'ǘ') return '2';
		if (ch === 'ǎ' || ch === 'ě' || ch === 'ǐ' || ch === 'ǒ' || ch === 'ǔ' || ch === 'ǚ') return '3';
		if (ch === 'à' || ch === 'è' || ch === 'ì' || ch === 'ò' || ch === 'ù' || ch === 'ǜ') return '4';
	}
	return null;
}

export function pinyinVariantsFromCanonical(pinyin: string): {
	diacritic: string;
	plain: string;
	numbered: string;
	syllables: string[];
	plainSyllables: string[];
} {
	const syllables = splitCanonicalSyllables(pinyin);
	const plainSyllables = syllables.map((s) => normalizePinyinPlain(s));
	const numbered = syllables.map((s) => {
		const plain = normalizePinyinPlain(s);
		const toneMatch = s.match(TONE_NUMBER_SUFFIX);
		if (toneMatch) return `${plain}${toneMatch[1]}`;
		const toneFromMark = inferToneNumber(s);
		return toneFromMark ? `${plain}${toneFromMark}` : plain;
	}).join(' ');

	return {
		diacritic: syllables.join(' '),
		plain: plainSyllables.join(''),
		numbered,
		syllables,
		plainSyllables,
	};
}
