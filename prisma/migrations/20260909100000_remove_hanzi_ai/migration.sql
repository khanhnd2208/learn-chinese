-- Remove the Hanzi Lab AI analysis workflow.
DROP TABLE IF EXISTS "CnHanziAiReport" CASCADE;
DROP TABLE IF EXISTS "CnHanziAiProviderAttempt" CASCADE;
DROP TABLE IF EXISTS "CnHanziAiGenerationJob" CASCADE;
DROP TABLE IF EXISTS "CnHanziAiFactDependency" CASCADE;
DROP TABLE IF EXISTS "CnHanziAiAnalysisRevision" CASCADE;
DROP TABLE IF EXISTS "CnHanziAiAnalysis" CASCADE;
DROP TABLE IF EXISTS "CnHanziAiDailyQuota" CASCADE;
DROP TABLE IF EXISTS "CnHanziAiProviderHealth" CASCADE;

DROP TYPE IF EXISTS "CnHanziAiContentStatus";
DROP TYPE IF EXISTS "CnHanziAiCandidateStatus";
DROP TYPE IF EXISTS "CnHanziAiRevisionKind";
DROP TYPE IF EXISTS "CnHanziAiJobKind";
DROP TYPE IF EXISTS "CnHanziAiJobStatus";
DROP TYPE IF EXISTS "CnHanziAiFailureCategory";
DROP TYPE IF EXISTS "CnHanziAiAttemptKind";
DROP TYPE IF EXISTS "CnHanziAiAttemptStatus";
DROP TYPE IF EXISTS "CnHanziAiReportStatus";
DROP TYPE IF EXISTS "CnHanziAiDependencyType";
