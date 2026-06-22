-- CreateTable
CREATE TABLE "CnUserMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnUserMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CnUserMessage_userId_dismissedAt_idx" ON "CnUserMessage"("userId", "dismissedAt");

-- CreateIndex
CREATE INDEX "CnUserMessage_createdAt_idx" ON "CnUserMessage"("createdAt" DESC);
