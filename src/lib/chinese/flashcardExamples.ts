/* ════════════════════════════════════════════════════════════════════════
   flashcardExamples.ts — Example selection and deck helpers for flashcards
   ════════════════════════════════════════════════════════════════════════ */
import type { FlashcardCardDTO, FlashcardExampleDTO } from '@/types/chinese';

const STATUS_RANK: Record<string, number> = {
	verified: 0,
	auto: 1,
	draft: 2,
};

const BLANK_TOKEN_RE = /\[blank\]|【】|_{2,}/i;

export interface FlashcardExampleSource {
	id: string;
	hanzi: string;
	pinyin: string;
	meaningVi: string;
	naturalnessStatus?: string | null;
	targetWordStart?: number | null;
	targetWordEnd?: number | null;
}

export interface FlashcardWordSource {
	id: string;
	simplified: string;
	pinyin: string;
	meaningVi: string;
	examples: FlashcardExampleSource[];
}

export interface FlashcardSetItemSource {
	id: string;
	wordId: string | null;
	word: FlashcardWordSource | null;
}

export function hasBlankToken(text: string): boolean {
	return BLANK_TOKEN_RE.test(text);
}

export function fillBlankTokens(text: string, replacement: string): string {
	const filled = replacement.trim();
	if (!filled) return text;
	return text
		.replace(/\[blank\]/gi, filled)
		.replace(/【】/g, filled)
		.replace(/_{2,}/g, filled);
}

export function primaryMeaning(meaningVi: string): string {
	return meaningVi.split(/[;；]/)[0]?.trim() || meaningVi.trim();
}

export function isStudyableFlashcardWord(word: Pick<FlashcardWordSource, 'simplified' | 'pinyin' | 'meaningVi'>): boolean {
	return Boolean(word.simplified.trim() && word.pinyin.trim() && word.meaningVi.trim());
}

function resolveTargetOffsets(
	hanzi: string,
	targetWord: string,
	start: number | null | undefined,
	end: number | null | undefined,
): { start: number; end: number } | null {
	if (
		start != null &&
		end != null &&
		start >= 0 &&
		end > start &&
		hanzi.slice(start, end) === targetWord
	) {
		return { start, end };
	}
	if (!targetWord) return null;
	const idx = hanzi.indexOf(targetWord);
	if (idx < 0) return null;
	if (hanzi.indexOf(targetWord, idx + 1) !== -1) return null;
	return { start: idx, end: idx + targetWord.length };
}

function meaningRank(meaningVi: string): number {
	return meaningVi.trim() && !hasBlankToken(meaningVi) ? 0 : 1;
}

function statusRank(status: string | null | undefined): number {
	return STATUS_RANK[status ?? 'draft'] ?? 2;
}

export function toFlashcardExample(
	example: FlashcardExampleSource,
	word: Pick<FlashcardWordSource, 'simplified' | 'pinyin' | 'meaningVi'>,
): FlashcardExampleDTO | null {
	const hanzi = fillBlankTokens(example.hanzi.trim(), word.simplified).trim();
	const pinyin = fillBlankTokens(example.pinyin.trim(), word.pinyin).trim();
	if (!hanzi || !pinyin || hasBlankToken(hanzi) || hasBlankToken(pinyin)) {
		return null;
	}

	const meaningVi = fillBlankTokens(example.meaningVi.trim(), primaryMeaning(word.meaningVi)).trim();
	const offsets = resolveTargetOffsets(
		hanzi,
		word.simplified,
		example.targetWordStart,
		example.targetWordEnd,
	);

	return {
		id: example.id,
		hanzi,
		pinyin,
		meaningVi,
		targetWordStart: offsets?.start ?? null,
		targetWordEnd: offsets?.end ?? null,
	};
}

export function selectFlashcardExamples(
	word: FlashcardWordSource,
	examples: FlashcardExampleSource[] = word.examples,
): FlashcardExampleDTO[] {
	const ranked = examples
		.map((example, index) => {
			const dto = toFlashcardExample(example, word);
			if (!dto) return null;
			return {
				dto,
				index,
				status: statusRank(example.naturalnessStatus),
				meaning: meaningRank(dto.meaningVi),
			};
		})
		.filter((row): row is NonNullable<typeof row> => row !== null);

	ranked.sort((a, b) => a.status - b.status || a.meaning - b.meaning || a.index - b.index);
	return ranked.map((row) => row.dto);
}

export function nextExampleIndex(current: number, total: number): number {
	if (total <= 0) return 0;
	return (current + 1) % total;
}

export interface HighlightSegment {
	text: string;
	highlight: boolean;
}

export function highlightTargetSegments(
	hanzi: string,
	targetWord: string,
	start: number | null | undefined,
	end: number | null | undefined,
): HighlightSegment[] {
	const offsets = resolveTargetOffsets(hanzi, targetWord, start, end);
	if (!offsets) return [{ text: hanzi, highlight: false }];
	const before = hanzi.slice(0, offsets.start);
	const target = hanzi.slice(offsets.start, offsets.end);
	const after = hanzi.slice(offsets.end);
	return [
		...(before ? [{ text: before, highlight: false }] : []),
		{ text: target, highlight: true },
		...(after ? [{ text: after, highlight: false }] : []),
	];
}

export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
	const next = [...items];
	for (let i = next.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[next[i], next[j]] = [next[j]!, next[i]!];
	}
	return next;
}

export function buildFlashcardCards(items: FlashcardSetItemSource[]): {
	cards: FlashcardCardDTO[];
	skippedCount: number;
} {
	const cards: FlashcardCardDTO[] = [];
	let skippedCount = 0;

	for (const item of items) {
		const word = item.word;
		if (!word || !item.wordId || !isStudyableFlashcardWord(word)) {
			skippedCount += 1;
			continue;
		}
		cards.push({
			id: word.id,
			itemId: item.id,
			simplified: word.simplified.trim(),
			pinyin: word.pinyin.trim(),
			meaningVi: word.meaningVi.trim(),
			examples: selectFlashcardExamples(word),
		});
	}

	return { cards, skippedCount };
}
