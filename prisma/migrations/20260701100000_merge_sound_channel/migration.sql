-- Merge listening + pinyin SRS channels into sound (3-channel model)

ALTER TYPE "CnQuestionType" ADD VALUE IF NOT EXISTS 'sound_to_hanzi';
ALTER TYPE "CnQuestionType" ADD VALUE IF NOT EXISTS 'sound_to_hanzi_typed';

ALTER TABLE "CnWordProgress" RENAME COLUMN "listeningCorrect" TO "soundCorrect";
ALTER TABLE "CnWordProgress" RENAME COLUMN "listeningTotal" TO "soundTotal";
ALTER TABLE "CnWordProgress" RENAME COLUMN "listeningDueAt" TO "soundDueAt";
ALTER TABLE "CnWordProgress" RENAME COLUMN "listeningIntervalIdx" TO "soundIntervalIdx";
ALTER TABLE "CnWordProgress" RENAME COLUMN "listeningHeavyLapses" TO "soundHeavyLapses";
ALTER TABLE "CnWordProgress" RENAME COLUMN "listeningMarkedKnownAt" TO "soundMarkedKnownAt";

-- Merge: keep the more-advanced track's schedule, sum attempt counters
UPDATE "CnWordProgress"
SET
  "soundDueAt" = "pinyinDueAt",
  "soundIntervalIdx" = "pinyinIntervalIdx",
  "soundHeavyLapses" = GREATEST("soundHeavyLapses", "pinyinHeavyLapses"),
  "soundMarkedKnownAt" = COALESCE("pinyinMarkedKnownAt", "soundMarkedKnownAt")
WHERE "pinyinIntervalIdx" > "soundIntervalIdx";

UPDATE "CnWordProgress"
SET
  "soundCorrect" = "soundCorrect" + "pinyinCorrect",
  "soundTotal" = "soundTotal" + "pinyinTotal";

ALTER INDEX IF EXISTS "CnWordProgress_userId_listeningDueAt_idx" RENAME TO "CnWordProgress_userId_soundDueAt_idx";
DROP INDEX IF EXISTS "CnWordProgress_userId_pinyinDueAt_idx";

ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "pinyinCorrect";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "pinyinTotal";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "pinyinDueAt";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "pinyinIntervalIdx";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "pinyinHeavyLapses";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "pinyinMarkedKnownAt";
