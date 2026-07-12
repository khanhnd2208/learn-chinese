-- AlterEnum
ALTER TYPE "CnAnswerSource" ADD VALUE 'hht';

-- CreateTable
CREATE TABLE "CnHhtProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "selectionWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "lastAnsweredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnHhtProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CnHhtProgress_userId_idx" ON "CnHhtProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CnHhtProgress_userId_wordId_key" ON "CnHhtProgress"("userId", "wordId");

-- AddForeignKey
ALTER TABLE "CnHhtProgress" ADD CONSTRAINT "CnHhtProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
