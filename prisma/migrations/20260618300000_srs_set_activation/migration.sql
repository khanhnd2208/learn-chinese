-- AlterTable
ALTER TABLE "CnWordSet" ADD COLUMN "srsActive" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark sets srsActive when any item word has existing SRS progress
UPDATE "CnWordSet" s
SET "srsActive" = true
WHERE EXISTS (
  SELECT 1
  FROM "CnWordSetItem" i
  INNER JOIN "CnWordProgress" p ON p."wordId" = i."wordId" AND p."userId" = s."userId"
  WHERE i."setId" = s."id" AND i."wordId" IS NOT NULL
);
