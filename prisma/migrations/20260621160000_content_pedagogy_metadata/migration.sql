-- Content metadata for pedagogy-aware question generation

CREATE TABLE "CnWordSense" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL DEFAULT '',
    "usageNoteVi" TEXT NOT NULL DEFAULT '',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "level" TEXT,

    CONSTRAINT "CnWordSense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CnWordSense_wordId_idx" ON "CnWordSense"("wordId");

ALTER TABLE "CnWordSense" ADD CONSTRAINT "CnWordSense_wordId_fkey"
    FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CnSimilarGroup" ADD COLUMN "confusionType" TEXT;
ALTER TABLE "CnSimilarGroup" ADD COLUMN "explanationVi" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CnSimilarGroup" ADD COLUMN "difficultyLevel" TEXT;
ALTER TABLE "CnSimilarGroup" ADD COLUMN "minimalDifferenceNote" TEXT NOT NULL DEFAULT '';

ALTER TABLE "CnHanzi" ADD COLUMN "componentAnalysisStatus" TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE "CnHanzi" ADD COLUMN "structureType" TEXT;
ALTER TABLE "CnHanzi" ADD COLUMN "strokeCount" INTEGER;

ALTER TABLE "CnWord" ADD COLUMN "pinyinPlain" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CnWord" ADD COLUMN "pinyinNumbered" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CnWord" ADD COLUMN "pinyinSyllables" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CnWord" ADD COLUMN "tones" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "CnWord" ADD COLUMN "frequencyRank" INTEGER;
ALTER TABLE "CnWord" ADD COLUMN "difficultyLevel" TEXT;
ALTER TABLE "CnWord" ADD COLUMN "isFunctionWord" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CnWord" ADD COLUMN "learningPriority" INTEGER;

ALTER TABLE "CnExample" ADD COLUMN "senseId" TEXT;
ALTER TABLE "CnExample" ADD COLUMN "tokens" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CnExample" ADD COLUMN "targetWordStart" INTEGER;
ALTER TABLE "CnExample" ADD COLUMN "targetWordEnd" INTEGER;
ALTER TABLE "CnExample" ADD COLUMN "difficultyLevel" TEXT;
ALTER TABLE "CnExample" ADD COLUMN "grammarTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CnExample" ADD COLUMN "naturalnessStatus" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "CnExample" ADD COLUMN "unknownWordEstimate" INTEGER;

CREATE INDEX "CnExample_senseId_idx" ON "CnExample"("senseId");

ALTER TABLE "CnExample" ADD CONSTRAINT "CnExample_senseId_fkey"
    FOREIGN KEY ("senseId") REFERENCES "CnWordSense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
