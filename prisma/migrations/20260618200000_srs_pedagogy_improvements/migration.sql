-- AlterEnum: add new question types
ALTER TYPE "CnQuestionType" ADD VALUE IF NOT EXISTS 'audio_to_pinyin_typed';
ALTER TYPE "CnQuestionType" ADD VALUE IF NOT EXISTS 'hanzi_from_meaning';

-- CreateEnum
CREATE TYPE "CnAnswerSource" AS ENUM ('practice', 'review', 'mark_known', 'integrated');

-- AlterTable CnWordProgress
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "sentenceUnlockedAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "hanziUnlockedAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "lastExampleId" TEXT;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "meaningHeavyLapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "listeningHeavyLapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "pinyinHeavyLapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "sentenceHeavyLapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "hanziHeavyLapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "isStickingPoint" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "meaningMarkedKnownAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "listeningMarkedKnownAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "pinyinMarkedKnownAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "sentenceMarkedKnownAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "hanziMarkedKnownAt" TIMESTAMP(3);
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "sentenceIntroDayKey" TEXT;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "sentenceIntroDayCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "hanziIntroDayKey" TEXT;
ALTER TABLE "CnWordProgress" ADD COLUMN IF NOT EXISTS "hanziIntroDayCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill unlock timestamps where meaning already familiar
UPDATE "CnWordProgress"
SET "sentenceUnlockedAt" = COALESCE("lastReviewedAt", "createdAt"),
    "hanziUnlockedAt" = COALESCE("lastReviewedAt", "createdAt")
WHERE "meaningIntervalIdx" >= 2
  AND ("sentenceUnlockedAt" IS NULL OR "hanziUnlockedAt" IS NULL);

-- AlterTable CnAnswerLog
ALTER TABLE "CnAnswerLog" ADD COLUMN IF NOT EXISTS "source" "CnAnswerSource" NOT NULL DEFAULT 'practice';

-- CreateTable
CREATE TABLE IF NOT EXISTS "CnUserComponentProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "componentKey" TEXT NOT NULL,
    "familiarity" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnUserComponentProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CnUserComponentProgress_userId_componentKey_key" ON "CnUserComponentProgress"("userId", "componentKey");
CREATE INDEX IF NOT EXISTS "CnUserComponentProgress_userId_idx" ON "CnUserComponentProgress"("userId");
