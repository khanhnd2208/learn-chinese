import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import { normalizeHanziAiTerm, isValidHanziAiTerm } from './hanziNormalization';
import { loadHanziKnownFacts, hashKnownFacts } from './hanziKnownFacts';
import { validateHanziAnalysis } from './hanziAnalysisValidator';
import { isLegacyPromptVersion, isTrustResultStale } from './hanziTrustPolicy';
import type { HanziAnalysisResult } from './hanziAnalysisSchema';
import { getCurrentHanziSchemaVersion, parseHanziRevisionResult } from './hanziSchemaRegistry';
import { HANZI_TRUST_PROMPT_VERSION } from './hanziTrustRegistry';
import { buildHanziPartLexicon } from './hanziPartLexicon';
import { DeepSeekHanziProvider, HanziProviderError } from './providers/deepseekHanziProvider';
import type { HanziAiPublicAnalysis, HanziKnownFacts } from './hanziAiTypes';

const ATTEMPT_TIMEOUT_MS = Number(process.env.HANZI_AI_ATTEMPT_TIMEOUT_MS ?? '20000');
const JOB_TIMEOUT_MS = Number(process.env.HANZI_AI_JOB_TIMEOUT_MS ?? '50000');
const LEASE_TTL_MS = Number(process.env.HANZI_AI_LEASE_TTL_MS ?? '75000');
const PROMPT_VERSION = process.env.HANZI_AI_PROMPT_VERSION ?? HANZI_TRUST_PROMPT_VERSION;
const SCHEMA_VERSION = getCurrentHanziSchemaVersion();
const MAX_RAW_OUTPUT = 32 * 1024;
const GENERATION_LIMIT_PER_MIN = 5;

type ApiActor = { id: string; role: string };

function asJson(value: unknown): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function dayKey(date = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
	}).format(date);
}

function generationDailyLimit(actor: ApiActor): number {
	return actor.role === 'admin' ? 100 : 20;
}

function calculateCost(inputTokens: number | null, outputTokens: number | null): number | null {
	if (inputTokens === null && outputTokens === null) return null;
	const inputRate = Number(process.env.HANZI_AI_INPUT_COST_PER_MILLION_USD ?? '0.14');
	const outputRate = Number(process.env.HANZI_AI_OUTPUT_COST_PER_MILLION_USD ?? '0.28');
	return ((inputTokens ?? 0) * inputRate + (outputTokens ?? 0) * outputRate) / 1_000_000;
}

async function providerAvailable(provider: string, model: string): Promise<boolean> {
	const health = await prisma.cnHanziAiProviderHealth.findUnique({ where: { provider_model: { provider, model } } });
	return !health?.openUntil || health.openUntil <= new Date();
}

async function recordProviderSuccess(provider: string, model: string): Promise<void> {
	await prisma.cnHanziAiProviderHealth.upsert({
		where: { provider_model: { provider, model } },
		create: { provider, model, lastSuccessAt: new Date() },
		update: {
			lastSuccessAt: new Date(), consecutiveTransientFailures: 0,
			transientWindowStartedAt: null, openUntil: null, lastErrorCode: null,
		},
	});
}

async function recordProviderTransientFailure(provider: string, model: string, code: string): Promise<void> {
	const now = new Date();
	const windowStart = new Date(now.getTime() - 120_000);
	await prisma.$transaction(async (tx) => {
		const row = await tx.cnHanziAiProviderHealth.upsert({
			where: { provider_model: { provider, model } },
			create: { provider, model, consecutiveTransientFailures: 1, transientWindowStartedAt: now, lastErrorCode: code },
			update: { lastErrorCode: code },
		});
		const inWindow = row.transientWindowStartedAt && row.transientWindowStartedAt >= windowStart;
		const failures = inWindow ? row.consecutiveTransientFailures + 1 : 1;
		await tx.cnHanziAiProviderHealth.update({
			where: { id: row.id },
			data: {
				consecutiveTransientFailures: failures,
				transientWindowStartedAt: inWindow ? row.transientWindowStartedAt : now,
				openUntil: failures >= 5 ? new Date(now.getTime() + 60_000) : row.openUntil,
			},
		});
	});
}

async function claimQuota(
	tx: Prisma.TransactionClient,
	actor: ApiActor,
): Promise<boolean> {
	const rows = await tx.$queryRaw<Array<{ generationCount: number }>>(Prisma.sql`
		INSERT INTO "CnHanziAiDailyQuota"
			("id", "userId", "dayKey", "generationCount", "reportActionCount", "createdAt", "updatedAt")
		VALUES (${randomUUID()}, ${actor.id}, ${dayKey()}, 1, 0, NOW(), NOW())
		ON CONFLICT ("userId", "dayKey") DO UPDATE
		SET "generationCount" = "CnHanziAiDailyQuota"."generationCount" + 1,
			"updatedAt" = NOW()
		WHERE "CnHanziAiDailyQuota"."generationCount" < ${generationDailyLimit(actor)}
		RETURNING "generationCount"
	`);
	return rows.length > 0;
}

async function acquireGeneration(
	term: string,
	actor: ApiActor,
	hardFactsHash: string,
	options: { allowReady?: boolean; kind?: 'initial' | 'admin_regenerate' } = {},
): Promise<
	| { kind: 'claimed'; analysisId: string; jobId: string; leaseToken: string; baseRevisionId: string | null; baseContentVersion: number }
	| { kind: 'busy'; analysisId: string }
	| { kind: 'ready'; analysisId: string }
> {
	const analysis = await prisma.cnHanziAiAnalysis.upsert({
		where: { normalizedTerm: term },
		create: { inputTerm: term, normalizedTerm: term },
		update: {},
	});
	const leaseToken = randomUUID();
	const staleBefore = new Date(Date.now() - LEASE_TTL_MS);
	return prisma.$transaction(async (tx) => {
		const current = await tx.cnHanziAiAnalysis.findUniqueOrThrow({ where: { id: analysis.id } });
		if (!options.allowReady && current.contentStatus === 'ready' && current.currentRevisionId) {
			if (current.hardFactsHash === hardFactsHash) {
				return { kind: 'ready' as const, analysisId: current.id };
			}
		}
		if (current.nextRetryAt && current.nextRetryAt > new Date()) {
			throw new AppError('AI đang tạm nghỉ sau lỗi provider. Vui lòng thử lại sau.', 503);
		}
		const claimed = await tx.cnHanziAiAnalysis.updateMany({
			where: {
				id: current.id,
				OR: [
					{ generationLeaseToken: null },
					{ generationLeaseAt: { lt: staleBefore } },
				],
			},
			data: { generationLeaseToken: leaseToken, generationLeaseAt: new Date() },
		});
		if (!claimed.count) return { kind: 'busy' as const, analysisId: current.id };
		if (!await claimQuota(tx, actor)) throw new AppError('Bạn đã hết lượt phân tích AI hôm nay', 429);
		const job = await tx.cnHanziAiGenerationJob.create({
			data: {
				analysisId: current.id, requestedById: actor.id, kind: options.kind ?? 'initial', status: 'running',
				quotaChargeable: true, baseRevisionId: current.currentRevisionId,
				baseContentVersion: current.contentVersion, hardFactsHash, startedAt: new Date(),
			},
		});
		return {
			kind: 'claimed' as const, analysisId: current.id, jobId: job.id, leaseToken,
			baseRevisionId: current.currentRevisionId, baseContentVersion: current.contentVersion,
		};
	});
}

async function saveAttempt(input: {
	jobId: string;
	kind: 'initial' | 'repair';
	status: 'succeeded' | 'failed' | 'timeout';
	provider: string;
	model: string;
	latencyMs: number;
	inputTokens?: number | null;
	outputTokens?: number | null;
	requestId?: string | null;
	errorCode?: string;
	rawOutput?: string;
}): Promise<void> {
	await prisma.cnHanziAiProviderAttempt.create({
		data: {
			jobId: input.jobId, kind: input.kind, status: input.status,
			provider: input.provider, model: input.model, latencyMs: input.latencyMs,
			inputTokens: input.inputTokens, outputTokens: input.outputTokens,
			estimatedCostUsd: calculateCost(input.inputTokens ?? null, input.outputTokens ?? null),
			providerRequestId: input.requestId, errorCode: input.errorCode,
			rawOutput: input.rawOutput?.slice(0, MAX_RAW_OUTPUT),
		},
	});
}

function nextTransientRetry(count: number): Date {
	const minutes = [1, 5, 15, 60][Math.min(count, 3)];
	return new Date(Date.now() + minutes * 60_000);
}

async function failGeneration(input: {
	analysisId: string;
	jobId: string;
	leaseToken: string;
	category: 'transient_provider' | 'content_validation' | 'curated_conflict' | 'configuration' | 'unknown';
	code: string;
	internalErrorId?: string;
}): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const row = await tx.cnHanziAiAnalysis.findFirst({
			where: { id: input.analysisId, generationLeaseToken: input.leaseToken },
		});
		await tx.cnHanziAiGenerationJob.update({
			where: { id: input.jobId },
			data: {
				status: 'failed', failureCategory: input.category, failureCode: input.code,
				internalErrorId: input.internalErrorId, completedAt: new Date(),
			},
		});
		if (!row) return;
		const transient = input.category === 'transient_provider';
		const content = input.category === 'content_validation' || input.category === 'curated_conflict';
		const nextContentCount = row.contentFailureCount + (content ? 1 : 0);
		await tx.cnHanziAiAnalysis.update({
			where: { id: row.id },
			data: {
				generationLeaseToken: null, generationLeaseAt: null, lastErrorCode: input.code,
				transientFailureCount: transient ? row.transientFailureCount + 1 : row.transientFailureCount,
				nextRetryAt: transient ? nextTransientRetry(row.transientFailureCount) : row.nextRetryAt,
				contentFailureCount: nextContentCount,
				contentStatus: content && nextContentCount >= 3 && !row.currentRevisionId ? 'needs_review' : row.contentStatus,
			},
		});
	});
}

async function commitValidResult(input: {
	analysisId: string;
	jobId: string;
	leaseToken: string;
	actorId: string;
	result: HanziAnalysisResult;
	knownFacts: HanziKnownFacts;
	hashes: { hardFactsHash: string; allFactsHash: string };
	provider: string;
	model: string;
	dependencies: Array<{ sourceType: 'word' | 'hanzi'; sourceId: string }>;
}): Promise<'accepted' | 'candidate'> {
	return prisma.$transaction(async (tx) => {
		const analysis = await tx.cnHanziAiAnalysis.findFirst({
			where: { id: input.analysisId, generationLeaseToken: input.leaseToken },
		});
		if (!analysis) throw new AppError('Generation lease đã hết hạn', 409);
		const revisionNumber = await tx.cnHanziAiAnalysisRevision.count({ where: { analysisId: analysis.id } }) + 1;
		const isFirst = !analysis.currentRevisionId;
		const publishReady = isFirst
			&& input.result.lexicalStatus === 'ready'
			&& input.result.exampleStatus === 'ready';
		const publishNeedsReview = isFirst && !publishReady;
		const revision = await tx.cnHanziAiAnalysisRevision.create({
			data: {
				analysisId: analysis.id, revisionNumber,
				candidateStatus: publishReady || publishNeedsReview ? 'accepted' : 'candidate',
				kind: isFirst ? 'ai_initial' : 'ai_regenerate',
				resultJson: asJson(input.result), schemaVersion: SCHEMA_VERSION, promptVersion: PROMPT_VERSION,
				provider: input.provider, model: input.model, baseRevisionId: analysis.currentRevisionId,
				baseContentVersion: analysis.contentVersion, hardFactsHash: input.hashes.hardFactsHash,
				allFactsHash: input.hashes.allFactsHash, knownFactsJson: asJson(input.knownFacts), createdById: input.actorId,
			},
		});
		await tx.cnHanziAiGenerationJob.update({
			where: { id: input.jobId },
			data: {
				status: publishReady || publishNeedsReview ? 'succeeded' : 'candidate_ready',
				candidateRevisionId: revision.id,
				completedAt: new Date(),
			},
		});
		if (publishReady || publishNeedsReview) {
			await tx.cnHanziAiAnalysis.update({
				where: { id: analysis.id },
				data: {
					currentRevisionId: revision.id,
					contentStatus: publishReady ? 'ready' : 'needs_review',
					contentVersion: { increment: 1 },
					hardFactsHash: input.hashes.hardFactsHash, allFactsHash: input.hashes.allFactsHash,
					contentFailureCount: 0, transientFailureCount: 0, nextRetryAt: null, lastErrorCode: null,
					generationLeaseToken: null, generationLeaseAt: null,
				},
			});
			await tx.cnHanziAiFactDependency.deleteMany({ where: { analysisId: analysis.id } });
			if (input.dependencies.length) {
				await tx.cnHanziAiFactDependency.createMany({
					data: input.dependencies.map((d) => ({ analysisId: analysis.id, ...d })), skipDuplicates: true,
				});
			}
		} else {
			await tx.cnHanziAiAnalysis.update({
				where: { id: analysis.id }, data: { generationLeaseToken: null, generationLeaseAt: null },
			});
		}
		return publishReady || publishNeedsReview ? 'accepted' : 'candidate';
	});
}

async function withPartLexicon(
	base: Omit<HanziAiPublicAnalysis, 'partLexicon'> & { analysis: HanziAnalysisResult },
): Promise<HanziAiPublicAnalysis> {
	const partLexicon = await buildHanziPartLexicon(base.analysis);
	return { ...base, partLexicon };
}

export async function getCachedHanziAiAnalysis(rawTerm: string): Promise<HanziAiPublicAnalysis | null> {
	const term = normalizeHanziAiTerm(rawTerm);
	if (!isValidHanziAiTerm(term)) throw new AppError('Vui lòng nhập từ 1 đến 4 chữ Hán', 400);
	const analysis = await prisma.cnHanziAiAnalysis.findUnique({
		where: { normalizedTerm: term }, include: { currentRevision: true },
	});
	if (!analysis) return null;
	const activeLease = analysis.generationLeaseToken && analysis.generationLeaseAt
		&& analysis.generationLeaseAt > new Date(Date.now() - LEASE_TTL_MS);
	if (activeLease && !analysis.currentRevision) {
		return { id: analysis.id, status: 'generating', analysis: null, contentVersion: analysis.contentVersion, openReportCount: analysis.openReportCount };
	}
	if (!analysis.currentRevision) {
		return {
			id: analysis.id, status: analysis.contentStatus, analysis: null,
			contentVersion: analysis.contentVersion, openReportCount: analysis.openReportCount,
		};
	}
	const parsed = parseHanziRevisionResult(analysis.currentRevision.resultJson, analysis.currentRevision.schemaVersion);
	if (!parsed.ok) {
		return { id: analysis.id, status: 'stale', analysis: null, contentVersion: analysis.contentVersion, openReportCount: analysis.openReportCount };
	}
	if (isTrustResultStale(parsed.data)) {
		return { id: analysis.id, status: 'stale', analysis: null, contentVersion: analysis.contentVersion, openReportCount: analysis.openReportCount };
	}
	const promptVersion = analysis.currentRevision.promptVersion;
	const legacyPrompt = isLegacyPromptVersion(promptVersion);
	const decompositionLimited = parsed.data.decompositionStatus !== 'full';
	if (analysis.contentStatus === 'blocked') {
		return { id: analysis.id, status: 'blocked', analysis: null, contentVersion: analysis.contentVersion, openReportCount: analysis.openReportCount };
	}
	if (analysis.contentStatus === 'needs_review') {
		return withPartLexicon({
			id: analysis.id, status: 'needs_review', analysis: parsed.data,
			contentVersion: analysis.contentVersion, openReportCount: analysis.openReportCount,
			promptVersion, legacyPrompt, pedagogyReviewPending: true, decompositionLimited,
		});
	}
	if (analysis.contentStatus !== 'ready') {
		return { id: analysis.id, status: analysis.contentStatus, analysis: null, contentVersion: analysis.contentVersion, openReportCount: analysis.openReportCount };
	}
	const { facts } = await loadHanziKnownFacts(term);
	const hashes = hashKnownFacts(facts);
	if (hashes.hardFactsHash !== analysis.hardFactsHash) {
		return { id: analysis.id, status: 'stale', analysis: null, contentVersion: analysis.contentVersion, openReportCount: analysis.openReportCount };
	}
	if (hashes.allFactsHash !== analysis.allFactsHash) {
		return withPartLexicon({
			id: analysis.id, status: 'ready', analysis: parsed.data, contentVersion: analysis.contentVersion,
			openReportCount: analysis.openReportCount, factsSoftStale: true, promptVersion, legacyPrompt, decompositionLimited,
		});
	}
	return withPartLexicon({
		id: analysis.id, status: 'ready', analysis: parsed.data, contentVersion: analysis.contentVersion,
		openReportCount: analysis.openReportCount, promptVersion, legacyPrompt, decompositionLimited,
	});
}

export async function generateHanziAiAnalysis(
	rawTerm: string,
	actor: ApiActor,
	options: { forceRegenerate?: boolean } = {},
): Promise<{
	status: 'ready' | 'generating';
	data: HanziAiPublicAnalysis;
}> {
	const term = normalizeHanziAiTerm(rawTerm);
	if (!isValidHanziAiTerm(term)) throw new AppError('Vui lòng nhập từ 1 đến 4 chữ Hán', 400);
	const minuteLimit = checkRateLimit(rateLimitKey(actor.id, 'hanzi-ai-generate'), { limit: actor.role === 'admin' ? 20 : GENERATION_LIMIT_PER_MIN, windowMs: 60_000 });
	if (!minuteLimit.allowed) throw new AppError('Quá nhiều yêu cầu phân tích. Vui lòng thử lại sau.', 429);

	const cached = await getCachedHanziAiAnalysis(term);
	if (cached?.status === 'ready' && !options.forceRegenerate) return { status: 'ready', data: cached };
	const needsRegenerate = options.forceRegenerate || cached?.status === 'stale';
	const provider = new DeepSeekHanziProvider();
	provider.assertConfigured();
	const providerName = 'deepseek';
	const model = process.env.HANZI_AI_MODEL ?? 'deepseek-v4-flash';
	if (!await providerAvailable(providerName, model)) throw new AppError('AI provider đang tạm nghỉ. Vui lòng thử lại sau.', 503);

	const { facts, dependencies } = await loadHanziKnownFacts(term);
	const hashes = hashKnownFacts(facts);
	const claim = await acquireGeneration(term, actor, hashes.hardFactsHash, {
		allowReady: needsRegenerate,
		kind: needsRegenerate && options.forceRegenerate ? 'admin_regenerate' : 'initial',
	});
	if (claim.kind === 'ready') {
		const result = await getCachedHanziAiAnalysis(term);
		if (!result) throw new AppError('Không tìm thấy kết quả', 500);
		return { status: 'ready', data: result };
	}
	if (claim.kind === 'busy') {
		return {
			status: 'generating',
			data: { id: claim.analysisId, status: 'generating', analysis: null, contentVersion: 1, openReportCount: 0 },
		};
	}

	const deadline = Date.now() + JOB_TIMEOUT_MS;
	try {
		let errors: string[] | undefined;
		let category: 'content_validation' | 'curated_conflict' = 'content_validation';
		for (const kind of ['initial', 'repair'] as const) {
			if (kind === 'repair' && !errors?.length) break;
			const remaining = deadline - Date.now();
			if (remaining <= 0) throw new HanziProviderError('Generation job timeout', 'JOB_TIMEOUT', 'transient_provider');
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, remaining));
			try {
				const output = await provider.generateAnalysis({ term, knownFacts: facts, repairErrors: errors, signal: controller.signal });
				const validated = validateHanziAnalysis(output.parsedJson, term, facts);
				if (!validated.result) {
					errors = validated.errors;
					category = validated.category;
					await saveAttempt({
						jobId: claim.jobId, kind, status: 'failed', provider: output.provider, model: output.model,
						latencyMs: output.latencyMs, inputTokens: output.inputTokens, outputTokens: output.outputTokens,
						requestId: output.requestId, errorCode: 'INVALID_PROVIDER_RESPONSE', rawOutput: output.rawText,
					});
					continue;
				}
				await saveAttempt({
					jobId: claim.jobId, kind, status: 'succeeded', provider: output.provider, model: output.model,
					latencyMs: output.latencyMs, inputTokens: output.inputTokens, outputTokens: output.outputTokens,
					requestId: output.requestId,
				});
				await recordProviderSuccess(output.provider, output.model);
				await commitValidResult({
					analysisId: claim.analysisId, jobId: claim.jobId, leaseToken: claim.leaseToken,
					actorId: actor.id, result: validated.result, knownFacts: facts, hashes,
					provider: output.provider, model: output.model, dependencies,
				});
				const result = await getCachedHanziAiAnalysis(term);
				if (!result) throw new AppError('Không đọc được kết quả vừa tạo', 500);
				return { status: result.status === 'generating' ? 'generating' : 'ready', data: result };
			} finally {
				clearTimeout(timeout);
			}
		}
		await failGeneration({ analysisId: claim.analysisId, jobId: claim.jobId, leaseToken: claim.leaseToken, category, code: 'INVALID_PROVIDER_RESPONSE' });
		throw new AppError('AI chưa tạo được kết quả hợp lệ. Nội dung đã được đưa vào kiểm tra.', 503);
	} catch (error) {
		if (error instanceof AppError) {
			const job = await prisma.cnHanziAiGenerationJob.findUnique({ where: { id: claim.jobId }, select: { status: true } });
			if (job?.status === 'running') {
				await failGeneration({
					analysisId: claim.analysisId, jobId: claim.jobId, leaseToken: claim.leaseToken,
					category: 'unknown', code: error.code ?? 'HANZI_AI_COMMIT_FAILED', internalErrorId: randomUUID(),
				});
			}
			throw error;
		}
		if (error instanceof HanziProviderError) {
			await saveAttempt({
				jobId: claim.jobId, kind: 'initial', status: error.code.includes('TIMEOUT') ? 'timeout' : 'failed',
				provider: providerName, model, latencyMs: 0, errorCode: error.code,
			});
			if (error.category === 'transient_provider') await recordProviderTransientFailure(providerName, model, error.code);
			await failGeneration({
				analysisId: claim.analysisId, jobId: claim.jobId, leaseToken: claim.leaseToken,
				category: error.category, code: error.code,
			});
			throw new AppError(error.message, error.category === 'configuration' ? 500 : 503);
		}
		const internalErrorId = randomUUID();
		console.error(`[hanzi-ai:${internalErrorId}]`, error);
		await failGeneration({
			analysisId: claim.analysisId, jobId: claim.jobId, leaseToken: claim.leaseToken,
			category: 'unknown', code: 'HANZI_AI_INTERNAL_ERROR', internalErrorId,
		});
		throw new AppError('Không thể hoàn tất phân tích lúc này', 500);
	} finally {
		await prisma.cnHanziAiAnalysis.updateMany({
			where: { id: claim.analysisId, generationLeaseToken: claim.leaseToken },
			data: { generationLeaseToken: null, generationLeaseAt: null },
		});
	}
}

export async function getHanziAiAnalysisById(id: string): Promise<HanziAiPublicAnalysis | null> {
	const row = await prisma.cnHanziAiAnalysis.findUnique({ where: { id }, select: { normalizedTerm: true } });
	return row ? getCachedHanziAiAnalysis(row.normalizedTerm) : null;
}

const REPORT_REASONS = new Set([
	'wrong_pinyin', 'wrong_han_viet', 'wrong_meaning', 'wrong_radical',
	'wrong_components', 'unnatural_mnemonic', 'unnatural_example', 'other',
]);

export async function reportHanziAiAnalysis(
	analysisId: string,
	userId: string,
	reason: string,
	note: string,
): Promise<void> {
	if (!REPORT_REASONS.has(reason)) throw new AppError('Lý do báo lỗi không hợp lệ', 400, 'INVALID_REPORT_REASON');
	const safeNote = note.trim().normalize('NFKC');
	if (safeNote.length > 500) throw new AppError('Ghi chú tối đa 500 ký tự', 400, 'REPORT_NOTE_TOO_LONG');
	await prisma.$transaction(async (tx) => {
		const quota = await tx.$queryRaw<Array<{ reportActionCount: number }>>(Prisma.sql`
			INSERT INTO "CnHanziAiDailyQuota"
				("id", "userId", "dayKey", "generationCount", "reportActionCount", "createdAt", "updatedAt")
			VALUES (${randomUUID()}, ${userId}, ${dayKey()}, 0, 1, NOW(), NOW())
			ON CONFLICT ("userId", "dayKey") DO UPDATE
			SET "reportActionCount" = "CnHanziAiDailyQuota"."reportActionCount" + 1,
				"updatedAt" = NOW()
			WHERE "CnHanziAiDailyQuota"."reportActionCount" < 10
			RETURNING "reportActionCount"
		`);
		if (!quota.length) throw new AppError('Bạn đã đạt giới hạn báo lỗi hôm nay', 429, 'REPORT_RATE_LIMITED');
		await tx.cnHanziAiAnalysis.findUniqueOrThrow({ where: { id: analysisId } });
		await tx.cnHanziAiReport.upsert({
			where: { analysisId_userId: { analysisId, userId } },
			create: { analysisId, userId, reason, note: safeNote },
			update: { reason, note: safeNote, status: 'open', resolvedAt: null, resolvedById: null },
		});
		const count = await tx.cnHanziAiReport.count({ where: { analysisId, status: 'open' } });
		await tx.cnHanziAiAnalysis.update({ where: { id: analysisId }, data: { openReportCount: count } });
	});
}
