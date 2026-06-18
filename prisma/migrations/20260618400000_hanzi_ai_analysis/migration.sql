CREATE TYPE "CnHanziAiContentStatus" AS ENUM ('empty', 'ready', 'needs_review', 'blocked');
CREATE TYPE "CnHanziAiCandidateStatus" AS ENUM ('candidate', 'accepted', 'rejected', 'superseded');
CREATE TYPE "CnHanziAiRevisionKind" AS ENUM ('ai_initial', 'ai_regenerate', 'admin_edit', 'schema_migration');
CREATE TYPE "CnHanziAiJobKind" AS ENUM ('initial', 'admin_regenerate', 'schema_migration');
CREATE TYPE "CnHanziAiJobStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'candidate_ready');
CREATE TYPE "CnHanziAiFailureCategory" AS ENUM ('transient_provider', 'content_validation', 'curated_conflict', 'configuration', 'unknown');
CREATE TYPE "CnHanziAiAttemptKind" AS ENUM ('initial', 'repair');
CREATE TYPE "CnHanziAiAttemptStatus" AS ENUM ('succeeded', 'failed', 'timeout');
CREATE TYPE "CnHanziAiReportStatus" AS ENUM ('open', 'resolved', 'dismissed');
CREATE TYPE "CnHanziAiDependencyType" AS ENUM ('word', 'hanzi');

ALTER TABLE "CnHanzi"
  ADD COLUMN "expertVerifiedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "systemCheckedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" TEXT;

ALTER TABLE "CnWord"
  ADD COLUMN "expertVerifiedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "systemCheckedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" TEXT;

CREATE TABLE "CnHanziAiAnalysis" (
  "id" TEXT NOT NULL, "inputTerm" TEXT NOT NULL, "normalizedTerm" TEXT NOT NULL,
  "contentStatus" "CnHanziAiContentStatus" NOT NULL DEFAULT 'empty',
  "currentRevisionId" TEXT, "contentVersion" INTEGER NOT NULL DEFAULT 1,
  "editedByHuman" BOOLEAN NOT NULL DEFAULT false, "generationLeaseToken" TEXT,
  "generationLeaseAt" TIMESTAMP(3), "contentFailureCount" INTEGER NOT NULL DEFAULT 0,
  "transientFailureCount" INTEGER NOT NULL DEFAULT 0, "nextRetryAt" TIMESTAMP(3),
  "hardFactsHash" TEXT NOT NULL DEFAULT '', "allFactsHash" TEXT NOT NULL DEFAULT '',
  "sourceFactsChangedAt" TIMESTAMP(3), "openReportCount" INTEGER NOT NULL DEFAULT 0,
  "reviewedAt" TIMESTAMP(3), "reviewedById" TEXT, "blockedAt" TIMESTAMP(3),
  "blockedById" TEXT, "lastErrorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CnHanziAiAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CnHanziAiAnalysisRevision" (
  "id" TEXT NOT NULL, "analysisId" TEXT NOT NULL, "revisionNumber" INTEGER NOT NULL,
  "candidateStatus" "CnHanziAiCandidateStatus" NOT NULL, "kind" "CnHanziAiRevisionKind" NOT NULL,
  "resultJson" JSONB NOT NULL, "schemaVersion" INTEGER NOT NULL, "promptVersion" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "model" TEXT NOT NULL, "baseRevisionId" TEXT,
  "baseContentVersion" INTEGER, "hardFactsHash" TEXT NOT NULL DEFAULT '',
  "allFactsHash" TEXT NOT NULL DEFAULT '', "knownFactsJson" JSONB, "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CnHanziAiAnalysisRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CnHanziAiGenerationJob" (
  "id" TEXT NOT NULL, "analysisId" TEXT NOT NULL, "requestedById" TEXT NOT NULL,
  "kind" "CnHanziAiJobKind" NOT NULL, "status" "CnHanziAiJobStatus" NOT NULL DEFAULT 'pending',
  "quotaChargeable" BOOLEAN NOT NULL DEFAULT true, "failureCategory" "CnHanziAiFailureCategory",
  "failureCode" TEXT, "internalErrorId" TEXT, "baseRevisionId" TEXT,
  "baseContentVersion" INTEGER, "hardFactsHash" TEXT NOT NULL DEFAULT '', "candidateRevisionId" TEXT,
  "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CnHanziAiGenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CnHanziAiProviderAttempt" (
  "id" TEXT NOT NULL, "jobId" TEXT NOT NULL, "kind" "CnHanziAiAttemptKind" NOT NULL,
  "status" "CnHanziAiAttemptStatus" NOT NULL, "provider" TEXT NOT NULL, "model" TEXT NOT NULL,
  "inputTokens" INTEGER, "outputTokens" INTEGER, "estimatedCostUsd" DECIMAL(12,8),
  "latencyMs" INTEGER NOT NULL, "providerRequestId" TEXT, "errorCode" TEXT, "rawOutput" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CnHanziAiProviderAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CnHanziAiFactDependency" (
  "id" TEXT NOT NULL, "analysisId" TEXT NOT NULL, "sourceType" "CnHanziAiDependencyType" NOT NULL,
  "sourceId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CnHanziAiFactDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CnHanziAiReport" (
  "id" TEXT NOT NULL, "analysisId" TEXT NOT NULL, "userId" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '', "status" "CnHanziAiReportStatus" NOT NULL DEFAULT 'open',
  "resolvedAt" TIMESTAMP(3), "resolvedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CnHanziAiReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CnHanziAiDailyQuota" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "dayKey" TEXT NOT NULL,
  "generationCount" INTEGER NOT NULL DEFAULT 0, "reportActionCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CnHanziAiDailyQuota_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CnHanziAiProviderHealth" (
  "id" TEXT NOT NULL, "provider" TEXT NOT NULL, "model" TEXT NOT NULL,
  "transientWindowStartedAt" TIMESTAMP(3), "consecutiveTransientFailures" INTEGER NOT NULL DEFAULT 0,
  "openUntil" TIMESTAMP(3), "lastSuccessAt" TIMESTAMP(3), "lastErrorCode" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CnHanziAiProviderHealth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CnHanziAiAnalysis_normalizedTerm_key" ON "CnHanziAiAnalysis"("normalizedTerm");
CREATE UNIQUE INDEX "CnHanziAiAnalysis_currentRevisionId_key" ON "CnHanziAiAnalysis"("currentRevisionId");
CREATE INDEX "CnHanziAiAnalysis_contentStatus_updatedAt_idx" ON "CnHanziAiAnalysis"("contentStatus", "updatedAt");
CREATE INDEX "CnHanziAiAnalysis_generationLeaseAt_idx" ON "CnHanziAiAnalysis"("generationLeaseAt");
CREATE INDEX "CnHanziAiRevision_candidate_idx" ON "CnHanziAiAnalysisRevision"("analysisId", "candidateStatus", "createdAt");
CREATE UNIQUE INDEX "CnHanziAiAnalysisRevision_analysisId_revisionNumber_key" ON "CnHanziAiAnalysisRevision"("analysisId", "revisionNumber");
CREATE INDEX "CnHanziAiJob_status_idx" ON "CnHanziAiGenerationJob"("analysisId", "status", "createdAt");
CREATE INDEX "CnHanziAiGenerationJob_requestedById_createdAt_idx" ON "CnHanziAiGenerationJob"("requestedById", "createdAt");
CREATE INDEX "CnHanziAiProviderAttempt_jobId_createdAt_idx" ON "CnHanziAiProviderAttempt"("jobId", "createdAt");
CREATE INDEX "CnHanziAiAttempt_provider_idx" ON "CnHanziAiProviderAttempt"("provider", "model", "createdAt");
CREATE INDEX "CnHanziAiFactDependency_sourceType_sourceId_idx" ON "CnHanziAiFactDependency"("sourceType", "sourceId");
CREATE UNIQUE INDEX "CnHanziAiDependency_unique" ON "CnHanziAiFactDependency"("analysisId", "sourceType", "sourceId");
CREATE INDEX "CnHanziAiReport_status_updatedAt_idx" ON "CnHanziAiReport"("status", "updatedAt");
CREATE UNIQUE INDEX "CnHanziAiReport_analysisId_userId_key" ON "CnHanziAiReport"("analysisId", "userId");
CREATE UNIQUE INDEX "CnHanziAiDailyQuota_userId_dayKey_key" ON "CnHanziAiDailyQuota"("userId", "dayKey");
CREATE UNIQUE INDEX "CnHanziAiProviderHealth_provider_model_key" ON "CnHanziAiProviderHealth"("provider", "model");

ALTER TABLE "CnHanziAiAnalysis" ADD CONSTRAINT "CnHanziAiAnalysis_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "CnHanziAiAnalysisRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CnHanziAiAnalysisRevision" ADD CONSTRAINT "CnHanziAiAnalysisRevision_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CnHanziAiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CnHanziAiGenerationJob" ADD CONSTRAINT "CnHanziAiGenerationJob_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CnHanziAiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CnHanziAiGenerationJob" ADD CONSTRAINT "CnHanziAiGenerationJob_candidateRevisionId_fkey" FOREIGN KEY ("candidateRevisionId") REFERENCES "CnHanziAiAnalysisRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CnHanziAiProviderAttempt" ADD CONSTRAINT "CnHanziAiProviderAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CnHanziAiGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CnHanziAiFactDependency" ADD CONSTRAINT "CnHanziAiFactDependency_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CnHanziAiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CnHanziAiReport" ADD CONSTRAINT "CnHanziAiReport_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CnHanziAiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
