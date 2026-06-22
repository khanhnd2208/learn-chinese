-- Remove hanzi SRS channel columns from CnWordProgress
DROP INDEX IF EXISTS "CnWordProgress_userId_hanziDueAt_idx";

ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "charCorrect";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "charTotal";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "hanziDueAt";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "hanziIntervalIdx";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "hanziUnlockedAt";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "hanziHeavyLapses";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "hanziMarkedKnownAt";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "hanziIntroDayKey";
ALTER TABLE "CnWordProgress" DROP COLUMN IF EXISTS "hanziIntroDayCount";
