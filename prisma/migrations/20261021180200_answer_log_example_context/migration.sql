-- AlterTable
ALTER TABLE "CnAnswerLog" ADD COLUMN     "answer" TEXT,
ADD COLUMN     "attempts" INTEGER,
ADD COLUMN     "channelIdxBefore" INTEGER,
ADD COLUMN     "disputed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exampleId" TEXT;

-- CreateIndex
CREATE INDEX "CnAnswerLog_exampleId_createdAt_idx" ON "CnAnswerLog"("exampleId", "createdAt");
