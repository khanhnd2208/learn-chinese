-- Add due-date indexes for remaining SRS channels (prefilter queries)
CREATE INDEX IF NOT EXISTS "CnWordProgress_userId_pinyinDueAt_idx" ON "CnWordProgress"("userId", "pinyinDueAt");
CREATE INDEX IF NOT EXISTS "CnWordProgress_userId_sentenceDueAt_idx" ON "CnWordProgress"("userId", "sentenceDueAt");
CREATE INDEX IF NOT EXISTS "CnWordProgress_userId_hanziDueAt_idx" ON "CnWordProgress"("userId", "hanziDueAt");
