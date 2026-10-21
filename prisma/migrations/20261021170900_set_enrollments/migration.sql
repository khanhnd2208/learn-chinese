-- AlterTable
ALTER TABLE "CnWordSet" ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "level" INTEGER,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CnSetEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "srsActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CnSetEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CnSetEnrollment_userId_setId_key" ON "CnSetEnrollment"("userId", "setId");

-- CreateIndex
CREATE INDEX "CnSetEnrollment_userId_srsActive_idx" ON "CnSetEnrollment"("userId", "srsActive");

-- CreateIndex
CREATE INDEX "CnWordSet_shared_level_sortOrder_idx" ON "CnWordSet"("shared", "level", "sortOrder");

-- AddForeignKey
ALTER TABLE "CnSetEnrollment" ADD CONSTRAINT "CnSetEnrollment_setId_fkey" FOREIGN KEY ("setId") REFERENCES "CnWordSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
