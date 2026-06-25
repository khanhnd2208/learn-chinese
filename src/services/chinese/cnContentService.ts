/* ════════════════════════════════════════════════════════════════════════
   cnContentService.ts — Chinese content lookup & word cards
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { splitHanzi } from '@/lib/chinese/hanziUtils';
import { assessLookupReadiness } from '@/lib/chinese/practiceReadiness';
import { enrichExampleDtoForFill } from '@/lib/chinese/verifiedExample';
import {
	channelMasteryLabel,
	channelMasteryLevel,
} from '@/lib/chinese/practiceTaxonomy';
import { progressToDTO } from '@/services/chinese/cnSrsService';
import type {
	CnChannelMasteryDTO,
	CnCoverageReportDTO,
	CnExampleDTO,
	CnHanziAnalysisDTO,
	CnHanziDTO,
	CnLookupResultDTO,
	CnLookupStatus,
	CnSentencePatternDTO,
	CnSimilarGroupDTO,
	CnWordCardDTO,
	CnWordDTO,
} from '@/types/chinese';
import type { CnHanzi, CnSentencePattern, CnWord } from '@prisma/client';

function hanziToDTO(h: CnHanzi): CnHanziDTO {
	return {
		id: h.id,
		char: h.char,
		pinyin: h.pinyin,
		hanViet: h.hanViet,
		meaningVi: h.meaningVi,
		components: h.components,
		radical: h.radical,
		mnemonicVi: h.mnemonicVi,
		similarGroupId: h.similarGroupId,
		componentAnalysisStatus: h.componentAnalysisStatus,
		status: h.status,
	};
}

function wordToDTO(w: CnWord): CnWordDTO {
	return {
		id: w.id,
		simplified: w.simplified,
		pinyin: w.pinyin,
		hanViet: w.hanViet,
		meaningVi: w.meaningVi,
		partOfSpeech: w.partOfSpeech,
		mnemonicVi: w.mnemonicVi,
		usageNoteVi: w.usageNoteVi || undefined,
		ghiChu: w.ghiChu || undefined,
		hskLevel: w.hskLevel,
		pinyinPlain: w.pinyinPlain || undefined,
		pinyinNumbered: w.pinyinNumbered || undefined,
		pinyinSyllables: w.pinyinSyllables.length ? w.pinyinSyllables : undefined,
		tones: w.tones.length ? w.tones : undefined,
		frequencyRank: w.frequencyRank,
		difficultyLevel: w.difficultyLevel,
		isFunctionWord: w.isFunctionWord,
		learningPriority: w.learningPriority,
		status: w.status,
	};
}

function patternToDTO(p: CnSentencePattern): CnSentencePatternDTO {
	const samples = Array.isArray(p.samples)
		? (p.samples as Array<{ hanzi: string; pinyin: string; meaningVi: string }>)
		: [];
	return { id: p.id, template: p.template, samples };
}

function resolveLookupStatus(
	word: CnWord | null,
	chars: CnHanzi[],
): CnLookupStatus {
	if (word && word.status === 'published') return 'full';
	if (chars.length > 0) return 'charsOnly';
	return 'none';
}

export async function lookupTerms(terms: string[]): Promise<CnLookupResultDTO[]> {
	const normalized = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
	if (!normalized.length) return [];

	const words = await prisma.cnWord.findMany({
		where: { simplified: { in: normalized }, status: 'published' },
		include: {
			chars: { include: { hanzi: true }, orderBy: { position: 'asc' } },
			examples: { take: 1, orderBy: { id: 'asc' } },
			patterns: { take: 1, orderBy: { id: 'asc' } },
		},
	});

	const wordMap = new Map(words.map((w) => [w.simplified, w]));
	const allChars = new Set<string>();
	for (const term of normalized) {
		for (const ch of splitHanzi(term)) allChars.add(ch);
	}

	const hanziList = await prisma.cnHanzi.findMany({
		where: { char: { in: [...allChars] }, status: 'published' },
	});
	const hanziMap = new Map(hanziList.map((h) => [h.char, h]));

	return normalized.map((term) => {
		const word = wordMap.get(term) ?? null;
		const chars = splitHanzi(term)
			.map((ch) => hanziMap.get(ch))
			.filter((h): h is CnHanzi => !!h)
			.map(hanziToDTO);

		const hasCharAnalysis = chars.length > 0 && chars.every((c) => c.components.length > 0 || c.radical);
		const status = resolveLookupStatus(word, hanziList.filter((h) => splitHanzi(term).includes(h.char)));

		const readiness = word
			? assessLookupReadiness({
				simplified: word.simplified,
				meaningVi: word.meaningVi,
				pinyin: word.pinyin,
				examples: word.examples.map((e) => ({
					hanzi: e.hanzi,
					targetWordStart: e.targetWordStart,
					targetWordEnd: e.targetWordEnd,
					naturalnessStatus: e.naturalnessStatus,
				})),
			})
			: {
				hasExample: false,
				supportsSentence: false,
			};

		return {
			term,
			status,
			word: word ? wordToDTO(word) : null,
			chars,
			hasPinyin: !!word?.pinyin,
			hasMeaning: !!word?.meaningVi,
			hasAudio: !!word?.pinyin,
			hasCharAnalysis,
			hasExample: readiness.hasExample,
			hasPattern: !!word?.patterns.length,
			supportsSentence: readiness.supportsSentence,
		};
	});
}

export function buildCoverageReport(results: CnLookupResultDTO[]): CnCoverageReportDTO {
	const pending = results.filter((r) => r.status === 'none').map((r) => r.term);
	return {
		total: results.length,
		inDatabase: results.filter((r) => r.status !== 'none').length,
		hasPinyin: results.filter((r) => r.hasPinyin).length,
		hasMeaning: results.filter((r) => r.hasMeaning).length,
		hasAudio: results.filter((r) => r.hasAudio).length,
		hasCharAnalysis: results.filter((r) => r.hasCharAnalysis).length,
		hasExample: results.filter((r) => r.hasExample).length,
		hasPattern: results.filter((r) => r.hasPattern).length,
		supportsSentence: results.filter((r) => r.supportsSentence).length,
		pending,
	};
}

const wordCardInclude = {
	examples: true,
	patterns: true,
	chars: { include: { hanzi: true }, orderBy: { position: 'asc' as const } },
} as const;

async function buildWordCardDTO(
	word: CnWord & {
		examples: Array<{
			id: string;
			hanzi: string;
			pinyin: string;
			meaningVi: string;
			meaningViTemplate: string;
			targetWordStart: number | null;
			targetWordEnd: number | null;
			naturalnessStatus: string;
		}>;
		patterns: CnSentencePattern[];
		chars: Array<{ position: number; hanzi: CnHanzi; hanziId: string }>;
	},
	userId?: string,
): Promise<CnWordCardDTO> {
	const charIds = word.chars.map((c) => c.hanziId);
	const [related, progressRow] = await Promise.all([
		charIds.length
			? prisma.cnWord.findMany({
					where: {
						status: 'published',
						id: { not: word.id },
						chars: { some: { hanziId: { in: charIds } } },
					},
					take: 6,
				})
			: Promise.resolve([]),
		userId
			? prisma.cnWordProgress.findUnique({
					where: { userId_wordId: { userId, wordId: word.id } },
				})
			: Promise.resolve(null),
	]);

	const progress = progressRow ? progressToDTO(progressRow) : null;
	const channelMastery: CnChannelMasteryDTO[] | undefined = progress
		? ([
			{ channel: 'meaning' as const, rate: progress.meaningRate, total: progress.meaningTotal },
			{ channel: 'listening' as const, rate: progress.listeningRate, total: progress.listeningTotal },
			{ channel: 'pinyin' as const, rate: progress.pinyinRate, total: progress.pinyinTotal },
			{ channel: 'sentence' as const, rate: progress.sentenceRate, total: progress.sentenceTotal },
		].map((ch) => {
			const level = channelMasteryLevel(ch.rate, ch.total);
			return { ...ch, level, label: channelMasteryLabel(level) };
		}))
		: undefined;

	return {
		...wordToDTO(word),
		examples: word.examples.map((e): CnExampleDTO =>
			enrichExampleDtoForFill({
				id: e.id,
				hanzi: e.hanzi,
				pinyin: e.pinyin,
				meaningVi: e.meaningVi,
				meaningViTemplate: e.meaningViTemplate,
				targetWordStart: e.targetWordStart,
				targetWordEnd: e.targetWordEnd,
				naturalnessStatus: e.naturalnessStatus,
			}, word.simplified),
		),
		patterns: word.patterns.map(patternToDTO),
		chars: word.chars.map((wc) => ({ ...hanziToDTO(wc.hanzi), position: wc.position })),
		relatedWords: related.map(wordToDTO),
		progress,
		channelMastery,
	};
}

/** Load word cards for SRS pool — includes draft words in the user's SRS-active sets */
export async function getWordCardsForSrsPool(
	userId: string,
	wordIds: string[],
): Promise<Map<string, CnWordCardDTO>> {
	const map = new Map<string, CnWordCardDTO>();
	const uniqueIds = [...new Set(wordIds)];
	if (!uniqueIds.length) return map;

	const published = await Promise.all(uniqueIds.map((id) => getWordCard(id, userId)));
	const missing: string[] = [];
	for (let i = 0; i < uniqueIds.length; i++) {
		if (published[i]) map.set(uniqueIds[i], published[i]!);
		else missing.push(uniqueIds[i]);
	}
	if (!missing.length) return map;

	const words = await prisma.cnWord.findMany({
		where: { id: { in: missing } },
		include: wordCardInclude,
	});

	for (const word of words) {
		map.set(word.id, await buildWordCardDTO(word, userId));
	}
	return map;
}

export async function getWordCard(wordId: string, userId?: string): Promise<CnWordCardDTO | null> {
	const word = await prisma.cnWord.findUnique({
		where: { id: wordId, status: 'published' },
		include: wordCardInclude,
	});
	if (!word) return null;
	return buildWordCardDTO(word, userId);
}

export async function getHanziAnalysis(term: string): Promise<CnHanziAnalysisDTO> {
	const normalized = term.trim();
	const results = await lookupTerms([normalized]);
	const lookup = results[0] ?? {
		term: normalized,
		status: 'none' as const,
		word: null,
		chars: [],
		hasPinyin: false,
		hasMeaning: false,
		hasAudio: false,
		hasCharAnalysis: false,
		hasExample: false,
		hasPattern: false,
		supportsSentence: false,
	};

	let word: CnWordCardDTO | null = null;
	if (lookup.word) {
		word = await getWordCard(lookup.word.id);
	}

	const chars = word?.chars ?? lookup.chars.map((c, i) => ({ ...c, position: i }));

	let similarGroup: CnSimilarGroupDTO | null = null;
	const groupId = chars.find((c) => c.similarGroupId)?.similarGroupId;
	if (groupId) {
		const group = await prisma.cnSimilarGroup.findUnique({
			where: { id: groupId },
			include: { hanzi: { where: { status: 'published' } } },
		});
		if (group) {
			similarGroup = {
				id: group.id,
				key: group.key,
				note: group.note,
				confusionType: group.confusionType,
				explanationVi: group.explanationVi,
				difficultyLevel: group.difficultyLevel,
				minimalDifferenceNote: group.minimalDifferenceNote,
				hanzi: group.hanzi.map(hanziToDTO),
			};
		}
	}

	return {
		term: normalized,
		status: lookup.status,
		word,
		chars,
		similarGroup,
		mnemonicOverall: word?.mnemonicVi ?? '',
	};
}

export async function getHanziByChar(char: string): Promise<CnHanziDTO | null> {
	const hanzi = await prisma.cnHanzi.findUnique({
		where: { char, status: 'published' },
	});
	return hanzi ? hanziToDTO(hanzi) : null;
}

export async function listHskWords(level: number): Promise<CnWordDTO[]> {
	const words = await prisma.cnWord.findMany({
		where: { hskLevel: level, status: 'published' },
		orderBy: { simplified: 'asc' },
	});
	return words.map(wordToDTO);
}

export async function listPublishedWords(limit = 500): Promise<CnWordDTO[]> {
	const words = await prisma.cnWord.findMany({
		where: { status: 'published' },
		orderBy: { simplified: 'asc' },
		take: limit,
	});
	return words.map(wordToDTO);
}

export interface UpdateWordFieldsInput {
	pinyin?: string;
	meaningVi?: string;
	hanViet?: string;
	partOfSpeech?: string;
	ghiChu?: string;
	mnemonicVi?: string;
}

async function userOwnsWord(userId: string, wordId: string): Promise<boolean> {
	const item = await prisma.cnWordSetItem.findFirst({
		where: { wordId, set: { userId } },
		select: { id: true },
	});
	return !!item;
}

export async function updateWordFields(
	userId: string,
	wordId: string,
	fields: UpdateWordFieldsInput,
): Promise<CnWordDTO | null> {
	if (!(await userOwnsWord(userId, wordId))) return null;

	const data: Partial<Pick<CnWord, 'pinyin' | 'meaningVi' | 'hanViet' | 'partOfSpeech' | 'ghiChu' | 'mnemonicVi'>> = {};
	if (fields.pinyin !== undefined) data.pinyin = fields.pinyin.trim();
	if (fields.meaningVi !== undefined) data.meaningVi = fields.meaningVi.trim();
	if (fields.hanViet !== undefined) data.hanViet = fields.hanViet.trim();
	if (fields.partOfSpeech !== undefined) data.partOfSpeech = fields.partOfSpeech.trim();
	if (fields.ghiChu !== undefined) data.ghiChu = fields.ghiChu.trim();
	if (fields.mnemonicVi !== undefined) data.mnemonicVi = fields.mnemonicVi.trim();

	if (!Object.keys(data).length) return null;

	const word = await prisma.cnWord.update({
		where: { id: wordId },
		data,
	});
	return wordToDTO(word);
}

/** Vocabulary pool for MCQ distractors — user's sets + HSK fallback */
export async function getUserDistractorPool(userId: string, minCount = 12): Promise<CnWordCardDTO[]> {
	const setItems = await prisma.cnWordSetItem.findMany({
		where: { set: { userId }, wordId: { not: null } },
		select: { wordId: true },
		distinct: ['wordId'],
	});
	let wordIds = setItems.map((i) => i.wordId).filter((id): id is string => !!id);

	if (wordIds.length < minCount) {
		const extra = await prisma.cnWord.findMany({
			where: {
				status: 'published',
				hskLevel: { lte: 2 },
				...(wordIds.length ? { id: { notIn: wordIds } } : {}),
			},
			take: Math.max(minCount * 2, 24),
			select: { id: true },
			orderBy: [{ hskLevel: 'asc' }, { simplified: 'asc' }],
		});
		wordIds = [...new Set([...wordIds, ...extra.map((e) => e.id)])];
	}

	const cards = await Promise.all(wordIds.slice(0, 60).map((id) => getWordCard(id)));
	return cards.filter((c): c is CnWordCardDTO => !!c);
}
