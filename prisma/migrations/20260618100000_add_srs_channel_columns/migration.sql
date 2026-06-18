-- Per-channel SRS scheduling columns (idempotent for dev DBs already db-push'd)
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "meaningDueAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "meaningIntervalIdx" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "listeningDueAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "listeningIntervalIdx" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "pinyinDueAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "pinyinIntervalIdx" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "sentenceDueAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "sentenceIntervalIdx" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "hanziDueAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "hanziIntervalIdx" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "CnWordProgress_userId_meaningDueAt_idx" ON "CnWordProgress"("userId", "meaningDueAt");
CREATE INDEX IF NOT EXISTS "CnWordProgress_userId_listeningDueAt_idx" ON "CnWordProgress"("userId", "listeningDueAt");
