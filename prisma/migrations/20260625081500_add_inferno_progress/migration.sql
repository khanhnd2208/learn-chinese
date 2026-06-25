-- AlterEnum
ALTER TYPE "CnAnswerSource" ADD VALUE 'inferno';

-- CreateTable
CREATE TABLE "CnInfernoProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "masteryScore" INTEGER NOT NULL DEFAULT 0,
    "correctMcq" INTEGER NOT NULL DEFAULT 0,
    "correctFill" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "lastAnsweredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnInfernoProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CnInfernoProgress_userId_idx" ON "CnInfernoProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CnInfernoProgress_userId_wordId_key" ON "CnInfernoProgress"("userId", "wordId");

-- AddForeignKey
ALTER TABLE "CnInfernoProgress" ADD CONSTRAINT "CnInfernoProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
