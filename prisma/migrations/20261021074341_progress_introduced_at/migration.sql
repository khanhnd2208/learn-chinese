-- AlterTable
ALTER TABLE "CnWordProgress" ADD COLUMN     "introducedAt" TIMESTAMP(3);

-- Words already practiced count as introduced so existing learners keep their queue.
UPDATE "CnWordProgress"
SET "introducedAt" = COALESCE("lastReviewedAt", "createdAt")
WHERE "meaningTotal" > 0 OR "soundTotal" > 0 OR "sentenceTotal" > 0;

-- CreateIndex
CREATE INDEX "CnWordProgress_userId_introducedAt_idx" ON "CnWordProgress"("userId", "introducedAt");
