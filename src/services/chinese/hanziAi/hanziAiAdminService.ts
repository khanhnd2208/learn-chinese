import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { validateHanziAnalysis } from './hanziAnalysisValidator';
import { loadHanziKnownFacts, hashKnownFacts } from './hanziKnownFacts';
import { getCurrentHanziSchemaVersion, parseHanziRevisionResult } from './hanziSchemaRegistry';

type DbClient = typeof prisma | Prisma.TransactionClient;

export type HanziAiReconcileTrigger = {
	type: 'word' | 'hanzi';
	id: string;
	term?: string;
	chars?: string[];
};

function asJson(value: unknown): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function collectAffectedAnalysisIds(
	tx: DbClient,
	triggers?: HanziAiReconcileTrigger[],
): Promise<Set<string>> {
	const ids = new Set<string>();
	if (!triggers?.length) {
		const deps = await tx.cnHanziAiFactDependency.findMany({
			select: { analysisId: true },
			distinct: ['analysisId'],
			take: 1000,
		});
		deps.forEach((d) => ids.add(d.analysisId));
		const analyses = await tx.cnHanziAiAnalysis.findMany({ select: { id: true, normalizedTerm: true } });
		const [words, hanzi] = await Promise.all([
			tx.cnWord.findMany({ where: { status: 'published' }, select: { simplified: true } }),
			tx.cnHanzi.findMany({ where: { status: 'published' }, select: { char: true } }),
		]);
		const wordTerms = new Set(words.map((w) => w.simplified));
		const hanziChars = new Set(hanzi.map((h) => h.char));
		for (const analysis of analyses) {
			if (wordTerms.has(analysis.normalizedTerm)) ids.add(analysis.id);
			else if ([...hanziChars].some((char) => analysis.normalizedTerm.includes(char))) ids.add(analysis.id);
		}
		return ids;
	}

	for (const trigger of triggers) {
		const deps = await tx.cnHanziAiFactDependency.findMany({
			where: { sourceType: trigger.type, sourceId: trigger.id },
			select: { analysisId: true },
		});
		deps.forEach((d) => ids.add(d.analysisId));
		if (trigger.term) {
			const byTerm = await tx.cnHanziAiAnalysis.findMany({
				where: { normalizedTerm: trigger.term },
				select: { id: true },
			});
			byTerm.forEach((a) => ids.add(a.id));
		}
		for (const char of trigger.chars ?? []) {
			const byChar = await tx.cnHanziAiAnalysis.findMany({
				where: { normalizedTerm: { contains: char } },
				select: { id: true },
			});
			byChar.forEach((a) => ids.add(a.id));
		}
	}
	return ids;
}

async function invalidateAnalysis(tx: DbClient, analysisId: string): Promise<void> {
	const analysis = await tx.cnHanziAiAnalysis.findUnique({ where: { id: analysisId } });
	if (!analysis) return;
	const { facts, dependencies } = await loadHanziKnownFacts(analysis.normalizedTerm, tx);
	const hashes = hashKnownFacts(facts);
	if (dependencies.length) {
		await tx.cnHanziAiFactDependency.createMany({
			data: dependencies.map((d) => ({ analysisId, ...d })),
			skipDuplicates: true,
		});
	}
	if (hashes.hardFactsHash !== analysis.hardFactsHash) {
		await tx.cnHanziAiAnalysis.update({
			where: { id: analysis.id },
			data: {
				contentStatus: 'needs_review',
				sourceFactsChangedAt: new Date(),
				contentVersion: { increment: 1 },
				hardFactsHash: hashes.hardFactsHash,
				allFactsHash: hashes.allFactsHash,
			},
		});
	} else if (hashes.allFactsHash !== analysis.allFactsHash) {
		await tx.cnHanziAiAnalysis.update({
			where: { id: analysis.id },
			data: { sourceFactsChangedAt: new Date(), allFactsHash: hashes.allFactsHash },
		});
	}
}

export async function reconcileHanziAiInTransaction(
	tx: Prisma.TransactionClient,
	triggers?: HanziAiReconcileTrigger[],
): Promise<{ reconciled: number }> {
	const analysisIds = await collectAffectedAnalysisIds(tx, triggers);
	for (const id of analysisIds) {
		await invalidateAnalysis(tx, id);
	}
	return { reconciled: analysisIds.size };
}

export async function listHanziAiAdminAnalyses(status?: string) {
	return prisma.cnHanziAiAnalysis.findMany({
		where: status && ['empty', 'ready', 'needs_review', 'blocked'].includes(status)
			? { contentStatus: status as 'empty' | 'ready' | 'needs_review' | 'blocked' }
			: undefined,
		include: {
			currentRevision: true,
			_count: { select: { revisions: true, reports: true, jobs: true } },
		},
		orderBy: [{ openReportCount: 'desc' }, { updatedAt: 'desc' }],
		take: 100,
	});
}

export async function getHanziAiAdminDetail(id: string) {
	return prisma.cnHanziAiAnalysis.findUnique({
		where: { id },
		include: {
			currentRevision: true,
			revisions: { orderBy: { revisionNumber: 'desc' }, take: 20 },
			jobs: { include: { attempts: true, candidateRevision: true }, orderBy: { createdAt: 'desc' }, take: 20 },
			reports: { orderBy: { updatedAt: 'desc' } },
			dependencies: true,
		},
	});
}

export async function blockHanziAiAnalysis(id: string, adminId: string, expectedVersion: number, blocked: boolean) {
	const updated = await prisma.cnHanziAiAnalysis.updateMany({
		where: { id, contentVersion: expectedVersion },
		data: blocked
			? { contentStatus: 'blocked', blockedAt: new Date(), blockedById: adminId, contentVersion: { increment: 1 } }
			: { contentStatus: 'ready', blockedAt: null, blockedById: null, contentVersion: { increment: 1 } },
	});
	if (!updated.count) throw new AppError('Nội dung đã thay đổi. Hãy tải lại trước khi lưu.', 409, 'CONTENT_VERSION_CONFLICT');
}

export async function editHanziAiAnalysis(
	id: string,
	adminId: string,
	expectedVersion: number,
	resultValue: unknown,
) {
	const analysis = await prisma.cnHanziAiAnalysis.findUnique({ where: { id }, include: { currentRevision: true } });
	if (!analysis || !analysis.currentRevision) throw new AppError('Không tìm thấy nội dung hiện hành', 404);
	if (analysis.contentVersion !== expectedVersion) throw new AppError('Nội dung đã thay đổi', 409, 'CONTENT_VERSION_CONFLICT');
	const { facts } = await loadHanziKnownFacts(analysis.normalizedTerm);
	const validated = validateHanziAnalysis(resultValue, analysis.normalizedTerm, facts);
	if (!validated.result) throw new AppError(`Nội dung chưa hợp lệ: ${validated.errors.join('; ')}`, 400, 'INVALID_ANALYSIS_CONTENT');
	const hashes = hashKnownFacts(facts);
	return prisma.$transaction(async (tx) => {
		const current = await tx.cnHanziAiAnalysis.findFirst({ where: { id, contentVersion: expectedVersion } });
		if (!current) throw new AppError('Nội dung đã thay đổi', 409, 'CONTENT_VERSION_CONFLICT');
		const revisionNumber = await tx.cnHanziAiAnalysisRevision.count({ where: { analysisId: id } }) + 1;
		const revision = await tx.cnHanziAiAnalysisRevision.create({
			data: {
				analysisId: id, revisionNumber, candidateStatus: 'accepted', kind: 'admin_edit',
				resultJson: asJson(validated.result), schemaVersion: getCurrentHanziSchemaVersion(),
				promptVersion: analysis.currentRevision!.promptVersion,
				provider: analysis.currentRevision!.provider, model: analysis.currentRevision!.model,
				baseRevisionId: current.currentRevisionId, baseContentVersion: current.contentVersion,
				hardFactsHash: hashes.hardFactsHash, allFactsHash: hashes.allFactsHash,
				knownFactsJson: asJson(facts), createdById: adminId,
			},
		});
		await tx.cnHanziAiAnalysis.update({
			where: { id }, data: {
				currentRevisionId: revision.id, contentStatus: 'ready', editedByHuman: true,
				contentVersion: { increment: 1 }, hardFactsHash: hashes.hardFactsHash,
				allFactsHash: hashes.allFactsHash, sourceFactsChangedAt: null,
			},
		});
		await tx.cnHanziAiAnalysisRevision.updateMany({
			where: { analysisId: id, candidateStatus: 'candidate', baseRevisionId: { not: revision.id } },
			data: { candidateStatus: 'superseded' },
		});
		return revision;
	});
}

export async function acceptHanziAiCandidate(
	analysisId: string,
	revisionId: string,
	adminId: string,
	expectedContentVersion: number,
) {
	const analysis = await prisma.cnHanziAiAnalysis.findUnique({ where: { id: analysisId } });
	const candidate = await prisma.cnHanziAiAnalysisRevision.findUnique({ where: { id: revisionId } });
	if (!analysis || !candidate || candidate.analysisId !== analysisId) throw new AppError('Không tìm thấy candidate', 404);
	const { facts, dependencies } = await loadHanziKnownFacts(analysis.normalizedTerm);
	const hashes = hashKnownFacts(facts);
	const schemaValid = parseHanziRevisionResult(candidate.resultJson, candidate.schemaVersion).ok;
	if (
		analysis.contentVersion !== expectedContentVersion || candidate.candidateStatus !== 'candidate'
		|| candidate.baseRevisionId !== analysis.currentRevisionId
		|| candidate.baseContentVersion !== analysis.contentVersion
		|| candidate.hardFactsHash !== hashes.hardFactsHash
		|| candidate.schemaVersion !== getCurrentHanziSchemaVersion() || !schemaValid
	) throw new AppError('Candidate đã cũ hoặc dữ liệu nguồn đã thay đổi', 409, 'STALE_CANDIDATE');

	return prisma.$transaction(async (tx) => {
		const locked = await tx.cnHanziAiAnalysis.updateMany({
			where: { id: analysisId, contentVersion: expectedContentVersion, currentRevisionId: analysis.currentRevisionId },
			data: {
				currentRevisionId: revisionId, contentStatus: 'ready', contentVersion: { increment: 1 },
				editedByHuman: false, hardFactsHash: hashes.hardFactsHash, allFactsHash: hashes.allFactsHash,
				sourceFactsChangedAt: null, reviewedAt: new Date(), reviewedById: adminId,
			},
		});
		if (!locked.count) throw new AppError('Nội dung đã thay đổi', 409, 'CONTENT_VERSION_CONFLICT');
		await tx.cnHanziAiAnalysisRevision.update({ where: { id: revisionId }, data: { candidateStatus: 'accepted' } });
		await tx.cnHanziAiAnalysisRevision.updateMany({
			where: { analysisId, candidateStatus: 'candidate', id: { not: revisionId } }, data: { candidateStatus: 'superseded' },
		});
		await tx.cnHanziAiFactDependency.deleteMany({ where: { analysisId } });
		if (dependencies.length) await tx.cnHanziAiFactDependency.createMany({ data: dependencies.map((d) => ({ analysisId, ...d })), skipDuplicates: true });
	});
}

export async function rejectHanziAiCandidate(analysisId: string, revisionId: string) {
	const updated = await prisma.cnHanziAiAnalysisRevision.updateMany({
		where: { id: revisionId, analysisId, candidateStatus: 'candidate' }, data: { candidateStatus: 'rejected' },
	});
	if (!updated.count) throw new AppError('Candidate không còn khả dụng', 409, 'STALE_CANDIDATE');
}

export async function resolveHanziAiReport(reportId: string, adminId: string, status: 'resolved' | 'dismissed') {
	return prisma.$transaction(async (tx) => {
		const report = await tx.cnHanziAiReport.update({
			where: { id: reportId }, data: { status, resolvedAt: new Date(), resolvedById: adminId },
		});
		const count = await tx.cnHanziAiReport.count({ where: { analysisId: report.analysisId, status: 'open' } });
		await tx.cnHanziAiAnalysis.update({ where: { id: report.analysisId }, data: { openReportCount: count } });
	});
}

export async function getHanziAiHealth() {
	const provider = process.env.HANZI_AI_PROVIDER ?? 'deepseek';
	const model = process.env.HANZI_AI_MODEL ?? 'deepseek-v4-flash';
	const health = await prisma.cnHanziAiProviderHealth.findUnique({ where: { provider_model: { provider, model } } });
	return {
		configured: !!process.env.DEEPSEEK_API_KEY,
		provider, model,
		lastSuccessAt: health?.lastSuccessAt?.toISOString() ?? null,
		lastErrorCode: health?.lastErrorCode ?? null,
		openUntil: health?.openUntil?.toISOString() ?? null,
	};
}

export async function updateCuratedVerification(input: {
	type: 'word' | 'hanzi'; id: string; systemCheckedFields: string[]; expertVerifiedFields: string[]; adminId: string;
}) {
	const allowed = input.type === 'word'
		? new Set(['pinyin', 'hanViet', 'meaningVi', 'partOfSpeech'])
		: new Set(['pinyin', 'hanViet', 'meaningVi', 'radical', 'components']);
	if ([...input.systemCheckedFields, ...input.expertVerifiedFields].some((field) => !allowed.has(field))) {
		throw new AppError('Field xác minh không hợp lệ', 400);
	}
	const overlap = input.systemCheckedFields.some((field) => input.expertVerifiedFields.includes(field));
	if (overlap) throw new AppError('Một field không thể có hai mức xác minh', 400);
	const data = {
		systemCheckedFields: [...new Set(input.systemCheckedFields)],
		expertVerifiedFields: [...new Set(input.expertVerifiedFields)],
		verifiedAt: new Date(), verifiedById: input.adminId,
	};
	if (input.type === 'word') {
		await prisma.$transaction(async (tx) => {
			const word = await tx.cnWord.update({ where: { id: input.id }, data });
			await reconcileHanziAiInTransaction(tx, [{
				type: 'word', id: word.id, term: word.simplified, chars: Array.from(word.simplified),
			}]);
		});
	} else {
		await prisma.$transaction(async (tx) => {
			const hanzi = await tx.cnHanzi.update({ where: { id: input.id }, data });
			await reconcileHanziAiInTransaction(tx, [{ type: 'hanzi', id: hanzi.id, chars: [hanzi.char] }]);
		});
	}
}

export async function reconcileHanziAiDependencies(type?: 'word' | 'hanzi', sourceId?: string) {
	return prisma.$transaction(async (tx) => {
		const triggers = type && sourceId ? [{ type, id: sourceId } as HanziAiReconcileTrigger] : undefined;
		return reconcileHanziAiInTransaction(tx, triggers);
	});
}

export async function purgeOldHanziAiAttempts(retentionDays = 30): Promise<number> {
	const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
	const result = await prisma.cnHanziAiProviderAttempt.deleteMany({
		where: { createdAt: { lt: cutoff } },
	});
	return result.count;
}

