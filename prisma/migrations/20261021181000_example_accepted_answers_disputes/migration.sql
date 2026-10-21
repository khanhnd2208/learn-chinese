-- AlterTable
ALTER TABLE "CnExample" ADD COLUMN     "acceptedAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "qualityReviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CnExampleDispute" (
    "id" TEXT NOT NULL,
    "exampleId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "clientAnswerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CnExampleDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CnExampleDispute_status_createdAt_idx" ON "CnExampleDispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CnExampleDispute_exampleId_status_idx" ON "CnExampleDispute"("exampleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CnExampleDispute_userId_clientAnswerId_key" ON "CnExampleDispute"("userId", "clientAnswerId");

-- AddForeignKey
ALTER TABLE "CnExampleDispute" ADD CONSTRAINT "CnExampleDispute_exampleId_fkey" FOREIGN KEY ("exampleId") REFERENCES "CnExample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
