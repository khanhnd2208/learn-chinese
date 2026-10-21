-- AlterTable
ALTER TABLE "CnAnswerLog" ADD COLUMN "clientAnswerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CnAnswerLog_userId_clientAnswerId_key" ON "CnAnswerLog"("userId", "clientAnswerId");
