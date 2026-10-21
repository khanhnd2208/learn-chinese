-- AlterTable
ALTER TABLE "CnExample" ADD COLUMN     "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "CnWord" ADD COLUMN     "createdByUserId" TEXT;

-- CreateTable
CREATE TABLE "CnUserWordOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "pinyin" TEXT,
    "hanViet" TEXT,
    "meaningVi" TEXT,
    "partOfSpeech" TEXT,
    "ghiChu" TEXT,
    "mnemonicVi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnUserWordOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CnUserWordOverride_wordId_idx" ON "CnUserWordOverride"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "CnUserWordOverride_userId_wordId_key" ON "CnUserWordOverride"("userId", "wordId");

-- CreateIndex
CREATE INDEX "CnExample_wordId_ownerUserId_idx" ON "CnExample"("wordId", "ownerUserId");

-- AddForeignKey
ALTER TABLE "CnUserWordOverride" ADD CONSTRAINT "CnUserWordOverride_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
