/* ════════════════════════════════════════════════════════════════════════
   cnSetService.ts — User Chinese word sets
   ════════════════════════════════════════════════════════════════════════ */
import { prisma } from '@/lib/prisma';
import { MAX_CN_TERMS_PER_SET } from '@/config/constants';
import { buildCoverageReport, lookupTerms } from '@/services/chinese/cnContentService';
import {
	activateSetInSrs,
	enrollWordsInSrs,
	onSetDeleted,
	onWordRemovedFromActiveSet,
} from '@/services/chinese/cnSrsEnrollmentService';
import { countDueChannelsForProgressList, fetchProgressDueCandidates, loadWordIdsWithFillExamples } from '@/services/chinese/cnSrsService';
import { normalizeTerm, uniqueTerms } from '@/lib/chinese/hanziUtils';
import type {
	CnCoverageReportDTO,
	CnWordSetDTO,
	CnWordSetListItemDTO,
	CreateCnWordSetInput,
} from '@/types/chinese';
import type { CnWord, CnWordProgress, CnWordSet, CnWordSetItem } from '@prisma/client';

function wordToBrief(w: CnWord) {
	return {
		id: w.id,
		simplified: w.simplified,
		pinyin: w.pinyin,
		hanViet: w.hanViet,
		meaningVi: w.meaningVi,
		partOfSpeech: w.partOfSpeech,
		mnemonicVi: w.mnemonicVi,
		ghiChu: w.ghiChu || undefined,
		hskLevel: w.hskLevel,
		status: w.status,
	};
}

async function countDueAndWeak(userId: string, wordIds: string[], srsActive: boolean) {
	if (!srsActive || !wordIds.length) return { dueCount: 0, weakCount: 0 };
	const now = new Date();
	const [candidates, allProgress, wordsWithFillExamples] = await Promise.all([
		fetchProgressDueCandidates(userId, wordIds, now),
		prisma.cnWordProgress.findMany({
			where: { userId, wordId: { in: wordIds } },
			select: { state: true },
		}),
		loadWordIdsWithFillExamples(wordIds),
	]);
	const dueCount = countDueChannelsForProgressList(candidates, now, wordsWithFillExamples);
	const weakCount = allProgress.filter((p) => p.state === 'weak' || p.state === 'learning').length;
	return { dueCount, weakCount };
}

function setToListItem(
	set: CnWordSet & { items: CnWordSetItem[] },
	stats: { dueCount: number; weakCount: number },
): CnWordSetListItemDTO {
	return {
		id: set.id,
		title: set.title,
		description: set.description,
		source: set.source,
		srsActive: set.srsActive,
		itemCount: set.items.length,
		dueCount: stats.dueCount,
		weakCount: stats.weakCount,
		createdAt: set.createdAt.toISOString(),
		updatedAt: set.updatedAt.toISOString(),
	};
}

export async function listUserSets(userId: string): Promise<CnWordSetListItemDTO[]> {
	const sets = await prisma.cnWordSet.findMany({
		where: { userId },
		include: { items: true },
		orderBy: { updatedAt: 'desc' },
	});

	const result: CnWordSetListItemDTO[] = [];
	for (const set of sets) {
		const wordIds = set.items.map((i) => i.wordId).filter((id): id is string => !!id);
		const stats = await countDueAndWeak(userId, wordIds, set.srsActive);
		result.push(setToListItem(set, stats));
	}
	return result;
}

export async function getUserSet(userId: string, setId: string): Promise<CnWordSetDTO | null> {
	const set = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: {
			items: {
				include: { word: true },
				orderBy: { rawTerm: 'asc' },
			},
		},
	});
	if (!set) return null;

	const wordIds = set.items.map((i) => i.wordId).filter((id): id is string => !!id);
	const stats = await countDueAndWeak(userId, wordIds, set.srsActive);
	const progressMap = wordIds.length
		? new Map(
				(await prisma.cnWordProgress.findMany({
					where: { userId, wordId: { in: wordIds } },
				})).map((p) => [p.wordId, p]),
			)
		: new Map<string, CnWordProgress>();

	return {
		id: set.id,
		title: set.title,
		description: set.description,
		source: set.source,
		srsActive: set.srsActive,
		itemCount: set.items.length,
		dueCount: stats.dueCount,
		weakCount: stats.weakCount,
		createdAt: set.createdAt.toISOString(),
		updatedAt: set.updatedAt.toISOString(),
		items: set.items.map((item) => ({
			id: item.id,
			rawTerm: item.rawTerm,
			wordId: item.wordId,
			word: item.word ? wordToBrief(item.word) : null,
			progressState: item.wordId ? (progressMap.get(item.wordId)?.state ?? 'new') : null,
		})),
	};
}

export async function createUserSet(
	userId: string,
	input: CreateCnWordSetInput,
): Promise<{ set: CnWordSetDTO; coverage: CnCoverageReportDTO }> {
	const terms = uniqueTerms(input.terms);
	if (!terms.length) throw new Error('Cần ít nhất một từ');
	if (terms.length > MAX_CN_TERMS_PER_SET) throw new Error(`Không quá ${MAX_CN_TERMS_PER_SET} từ mỗi bộ`);

	const lookups = await lookupTerms(terms);
	const coverage = buildCoverageReport(lookups);
	const lookupMap = new Map(lookups.map((l) => [l.term, l]));

	const set = await prisma.cnWordSet.create({
		data: {
			userId,
			title: input.title.trim(),
			description: input.description?.trim() ?? '',
			source: input.source ?? 'manual',
			srsActive: false,
			items: {
				create: terms.map((term) => ({
					rawTerm: term,
					wordId: lookupMap.get(term)?.word?.id ?? null,
				})),
			},
		},
		include: { items: { include: { word: true } } },
	});

	if (input.srsActive) {
		await activateSetInSrs(userId, set.id);
	}

	const full = await getUserSet(userId, set.id);
	return { set: full!, coverage };
}

export async function updateUserSet(
	userId: string,
	setId: string,
	data: { title?: string; description?: string },
): Promise<CnWordSetDTO | null> {
	const existing = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!existing) return null;

	await prisma.cnWordSet.update({
		where: { id: setId },
		data: {
			...(data.title !== undefined && { title: data.title.trim() }),
			...(data.description !== undefined && { description: data.description.trim() }),
		},
	});
	return getUserSet(userId, setId);
}

export async function deleteUserSet(userId: string, setId: string): Promise<boolean> {
	const existing = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!existing) return false;
	await onSetDeleted(userId, setId);
	await prisma.cnWordSet.delete({ where: { id: setId } });
	return true;
}

export async function addTermsToSet(
	userId: string,
	setId: string,
	terms: string[],
): Promise<{ set: CnWordSetDTO; coverage: CnCoverageReportDTO; enrolledCount: number } | null> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set) return null;

	const normalized = uniqueTerms(terms);
	const lookups = await lookupTerms(normalized);
	const coverage = buildCoverageReport(lookups);
	const lookupMap = new Map(lookups.map((l) => [l.term, l]));

	const newWordIds: string[] = [];
	for (const term of normalized) {
		const wordId = lookupMap.get(term)?.word?.id ?? null;
		await prisma.cnWordSetItem.upsert({
			where: { setId_rawTerm: { setId, rawTerm: term } },
			create: { setId, rawTerm: term, wordId },
			update: { wordId },
		});
		if (wordId) newWordIds.push(wordId);
	}

	if (set.srsActive && newWordIds.length) {
		await enrollWordsInSrs(userId, newWordIds);
	}

	await prisma.cnWordSet.update({ where: { id: setId }, data: { updatedAt: new Date() } });
	const full = await getUserSet(userId, setId);
	return {
		set: full!,
		coverage,
		enrolledCount: set.srsActive ? newWordIds.length : 0,
	};
}

export async function removeItemFromSet(
	userId: string,
	setId: string,
	itemId: string,
): Promise<{ ok: boolean; purgedProgress: boolean }> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set) return { ok: false, purgedProgress: false };

	const item = await prisma.cnWordSetItem.findFirst({ where: { id: itemId, setId } });
	if (!item) return { ok: false, purgedProgress: false };

	await prisma.cnWordSetItem.deleteMany({ where: { id: itemId, setId } });

	let purgedProgress = false;
	if (item.wordId) {
		const purgedCount = await onWordRemovedFromActiveSet(userId, setId, item.wordId);
		purgedProgress = purgedCount > 0;
	}
	return { ok: true, purgedProgress };
}

export async function removeItemsFromSet(
	userId: string,
	setId: string,
	itemIds: string[],
): Promise<{ ok: boolean; removedCount: number; purgedProgressCount: number }> {
	let removedCount = 0;
	let purgedProgressCount = 0;
	for (const itemId of itemIds) {
		const result = await removeItemFromSet(userId, setId, itemId);
		if (result.ok) {
			removedCount += 1;
			if (result.purgedProgress) purgedProgressCount += 1;
		}
	}
	return { ok: removedCount > 0, removedCount, purgedProgressCount };
}

export interface ResolveSetItemWordInput {
	pinyin: string;
	meaningVi: string;
	hanViet?: string;
	partOfSpeech?: string;
	ghiChu?: string;
	mnemonicVi?: string;
}

export async function resolveSetItemWithWordData(
	userId: string,
	setId: string,
	itemId: string,
	fields: ResolveSetItemWordInput,
): Promise<CnWordSetDTO | null> {
	const set = await prisma.cnWordSet.findFirst({ where: { id: setId, userId } });
	if (!set) return null;

	const item = await prisma.cnWordSetItem.findFirst({ where: { id: itemId, setId } });
	if (!item) return null;

	const simplified = normalizeTerm(item.rawTerm);
	if (!simplified) return null;
	if (!fields.pinyin.trim() || !fields.meaningVi.trim()) {
		throw new Error('Pinyin và nghĩa tiếng Việt là bắt buộc');
	}

	const word = await prisma.cnWord.upsert({
		where: { simplified },
		create: {
			simplified,
			pinyin: fields.pinyin.trim(),
			meaningVi: fields.meaningVi.trim(),
			hanViet: fields.hanViet?.trim() ?? '',
			partOfSpeech: fields.partOfSpeech?.trim() ?? '',
			ghiChu: fields.ghiChu?.trim() ?? '',
			mnemonicVi: fields.mnemonicVi?.trim() ?? '',
			status: 'published',
		},
		update: {
			pinyin: fields.pinyin.trim(),
			meaningVi: fields.meaningVi.trim(),
			hanViet: fields.hanViet?.trim() ?? '',
			partOfSpeech: fields.partOfSpeech?.trim() ?? '',
			ghiChu: fields.ghiChu?.trim() ?? '',
			mnemonicVi: fields.mnemonicVi?.trim() ?? '',
			status: 'published',
		},
	});

	await prisma.cnWordSetItem.update({
		where: { id: itemId },
		data: { wordId: word.id, rawTerm: simplified },
	});

	if (set.srsActive) {
		await enrollWordsInSrs(userId, [word.id]);
	}

	await prisma.cnWordSet.update({ where: { id: setId }, data: { updatedAt: new Date() } });
	return getUserSet(userId, setId);
}

export async function moveItemToSet(
	userId: string,
	fromSetId: string,
	itemId: string,
	toSetId: string,
): Promise<boolean> {
	const [from, to, item] = await Promise.all([
		prisma.cnWordSet.findFirst({ where: { id: fromSetId, userId } }),
		prisma.cnWordSet.findFirst({ where: { id: toSetId, userId } }),
		prisma.cnWordSetItem.findFirst({ where: { id: itemId, setId: fromSetId } }),
	]);
	if (!from || !to || !item) return false;

	const rawTerm = normalizeTerm(item.rawTerm);
	const existing = await prisma.cnWordSetItem.findUnique({
		where: { setId_rawTerm: { setId: toSetId, rawTerm } },
	});
	if (existing) {
		await prisma.cnWordSetItem.delete({ where: { id: itemId } });
	} else {
		await prisma.cnWordSetItem.update({
			where: { id: itemId },
			data: { setId: toSetId },
		});
	}

	if (item.wordId) {
		if (from.srsActive) {
			await onWordRemovedFromActiveSet(userId, fromSetId, item.wordId);
		}
		if (to.srsActive) {
			await enrollWordsInSrs(userId, [item.wordId]);
		}
	}
	return true;
}

export async function duplicateUserSet(userId: string, setId: string): Promise<CnWordSetDTO | null> {
	const source = await prisma.cnWordSet.findFirst({
		where: { id: setId, userId },
		include: { items: true },
	});
	if (!source) return null;

	const copy = await prisma.cnWordSet.create({
		data: {
			userId,
			title: `${source.title} (bản sao)`,
			description: source.description,
			source: source.source,
			srsActive: false,
			items: {
				create: source.items.map((item) => ({
					rawTerm: item.rawTerm,
					wordId: item.wordId,
				})),
			},
		},
	});

	return getUserSet(userId, copy.id);
}

export async function previewTermsCoverage(terms: string[]): Promise<CnCoverageReportDTO> {
	const lookups = await lookupTerms(uniqueTerms(terms));
	return buildCoverageReport(lookups);
}

export async function createSetFromHsk(
	userId: string,
	level: number,
	title: string,
	srsActive?: boolean,
): Promise<{ set: CnWordSetDTO; coverage: CnCoverageReportDTO }> {
	const words = await prisma.cnWord.findMany({
		where: { hskLevel: level, status: 'published' },
		select: { simplified: true },
	});
	if (!words.length) throw new Error(`Chưa có từ HSK ${level} trong database`);
	return createUserSet(userId, {
		title,
		source: 'hsk',
		terms: words.map((w) => w.simplified),
		srsActive,
	});
}
