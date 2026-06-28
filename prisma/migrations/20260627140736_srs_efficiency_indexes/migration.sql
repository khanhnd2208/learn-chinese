-- CreateIndex
CREATE INDEX "CnAnswerLog_userId_source_createdAt_idx" ON "CnAnswerLog"("userId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "CnExample_wordId_naturalnessStatus_idx" ON "CnExample"("wordId", "naturalnessStatus");

-- CreateIndex
CREATE INDEX "CnWordSet_userId_srsActive_idx" ON "CnWordSet"("userId", "srsActive");

-- CreateIndex
CREATE INDEX "CnWordSet_shared_idx" ON "CnWordSet"("shared");
