-- CreateEnum
CREATE TYPE "EnContentStatus" AS ENUM ('draft', 'published', 'suspended');

-- CreateEnum
CREATE TYPE "EnWordSkill" AS ENUM ('meaning', 'sound', 'usage');

-- CreateEnum
CREATE TYPE "EnAnswerSkill" AS ENUM ('meaning', 'sound', 'usage', 'pattern');

-- CreateEnum
CREATE TYPE "EnStage" AS ENUM ('new', 'recall', 'maintain');

-- CreateEnum
CREATE TYPE "EnQuestionKind" AS ENUM ('meaning_choice', 'meaning_confusable', 'listen_choice', 'listen_type', 'spell_type', 'usage_fill', 'pattern_order', 'pattern_fill');

-- CreateEnum
CREATE TYPE "EnGradeResult" AS ENUM ('target_correct', 'alternate_plausible', 'wrong', 'pending_review', 'skipped');

-- CreateEnum
CREATE TYPE "EnExampleRole" AS ENUM ('study', 'grade');

-- CreateTable
CREATE TABLE "EnWord" (
    "id" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "ipa" TEXT NOT NULL DEFAULT '',
    "stress" TEXT NOT NULL DEFAULT '',
    "partOfSpeech" TEXT NOT NULL DEFAULT '',
    "forms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audioPath" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSense" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL DEFAULT '',
    "collocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pitfallVi" TEXT NOT NULL DEFAULT '',
    "distractorMeanings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "distractorLemmas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnSense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnExample" (
    "id" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL DEFAULT '',
    "target" TEXT NOT NULL,
    "audioPath" TEXT NOT NULL DEFAULT '',
    "role" "EnExampleRole" NOT NULL DEFAULT 'study',
    "alternatives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ambiguityNote" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPattern" (
    "id" TEXT NOT NULL,
    "purposeVi" TEXT NOT NULL,
    "frame" TEXT NOT NULL,
    "fixedParts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slots" JSONB NOT NULL DEFAULT '[]',
    "pitfallVi" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPatternExample" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL DEFAULT '',
    "slotValues" JSONB NOT NULL DEFAULT '[]',
    "audioPath" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnPatternExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPatternSense" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,

    CONSTRAINT "EnPatternSense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnQuestion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "EnQuestionKind" NOT NULL,
    "skill" "EnAnswerSkill" NOT NULL,
    "stage" "EnStage" NOT NULL,
    "senseId" TEXT,
    "patternId" TEXT,
    "exampleId" TEXT,
    "patternExampleId" TEXT,
    "prompt" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "acceptedAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audioPath" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSetItem" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "senseId" TEXT,
    "patternId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EnSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSenseSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "skill" "EnWordSkill" NOT NULL,
    "intervalIdx" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT NOT NULL DEFAULT 'learning',
    "lastReviewedAt" TIMESTAMP(3),
    "introducedAt" TIMESTAMP(3),
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "longGapRecallAt" TIMESTAMP(3),
    "usageExampleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastExampleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnSenseSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPatternProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "intervalIdx" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT NOT NULL DEFAULT 'learning',
    "lastReviewedAt" TIMESTAMP(3),
    "introducedAt" TIMESTAMP(3),
    "credits" JSONB NOT NULL DEFAULT '[]',
    "lastExampleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnPatternProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnAnswerLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "senseId" TEXT,
    "patternId" TEXT,
    "exampleId" TEXT,
    "skill" "EnAnswerSkill" NOT NULL,
    "clientAnswerId" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "result" "EnGradeResult" NOT NULL,
    "audioOpened" BOOLEAN NOT NULL DEFAULT false,
    "intervalIdxBefore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnAnswerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnAudioOpen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "clientAnswerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnAudioOpen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnDispute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "clientAnswerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnWord_status_idx" ON "EnWord"("status");

-- CreateIndex
CREATE INDEX "EnWord_lemma_idx" ON "EnWord"("lemma");

-- CreateIndex
CREATE INDEX "EnSense_wordId_idx" ON "EnSense"("wordId");

-- CreateIndex
CREATE INDEX "EnSense_status_idx" ON "EnSense"("status");

-- CreateIndex
CREATE INDEX "EnExample_senseId_status_role_idx" ON "EnExample"("senseId", "status", "role");

-- CreateIndex
CREATE INDEX "EnPattern_status_idx" ON "EnPattern"("status");

-- CreateIndex
CREATE INDEX "EnPatternExample_patternId_status_idx" ON "EnPatternExample"("patternId", "status");

-- CreateIndex
CREATE INDEX "EnPatternSense_senseId_idx" ON "EnPatternSense"("senseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnPatternSense_patternId_senseId_key" ON "EnPatternSense"("patternId", "senseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnQuestion_key_key" ON "EnQuestion"("key");

-- CreateIndex
CREATE INDEX "EnQuestion_status_skill_stage_idx" ON "EnQuestion"("status", "skill", "stage");

-- CreateIndex
CREATE INDEX "EnQuestion_senseId_idx" ON "EnQuestion"("senseId");

-- CreateIndex
CREATE INDEX "EnQuestion_patternId_idx" ON "EnQuestion"("patternId");

-- CreateIndex
CREATE INDEX "EnQuestion_exampleId_idx" ON "EnQuestion"("exampleId");

-- CreateIndex
CREATE INDEX "EnSet_status_sortOrder_idx" ON "EnSet"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "EnSetItem_setId_position_idx" ON "EnSetItem"("setId", "position");

-- CreateIndex
CREATE INDEX "EnSetItem_senseId_idx" ON "EnSetItem"("senseId");

-- CreateIndex
CREATE INDEX "EnSetItem_patternId_idx" ON "EnSetItem"("patternId");

-- CreateIndex
CREATE INDEX "EnEnrollment_userId_idx" ON "EnEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnEnrollment_userId_setId_key" ON "EnEnrollment"("userId", "setId");

-- CreateIndex
CREATE INDEX "EnSenseSkill_userId_dueAt_idx" ON "EnSenseSkill"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "EnSenseSkill_userId_skill_dueAt_idx" ON "EnSenseSkill"("userId", "skill", "dueAt");

-- CreateIndex
CREATE INDEX "EnSenseSkill_userId_introducedAt_idx" ON "EnSenseSkill"("userId", "introducedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnSenseSkill_userId_senseId_skill_key" ON "EnSenseSkill"("userId", "senseId", "skill");

-- CreateIndex
CREATE INDEX "EnPatternProgress_userId_dueAt_idx" ON "EnPatternProgress"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnPatternProgress_userId_patternId_key" ON "EnPatternProgress"("userId", "patternId");

-- CreateIndex
CREATE INDEX "EnAnswerLog_userId_createdAt_idx" ON "EnAnswerLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EnAnswerLog_userId_senseId_skill_idx" ON "EnAnswerLog"("userId", "senseId", "skill");

-- CreateIndex
CREATE INDEX "EnAnswerLog_userId_patternId_idx" ON "EnAnswerLog"("userId", "patternId");

-- CreateIndex
CREATE INDEX "EnAnswerLog_questionId_createdAt_idx" ON "EnAnswerLog"("questionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnAnswerLog_userId_clientAnswerId_key" ON "EnAnswerLog"("userId", "clientAnswerId");

-- CreateIndex
CREATE INDEX "EnAudioOpen_userId_questionId_idx" ON "EnAudioOpen"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnAudioOpen_userId_clientAnswerId_key" ON "EnAudioOpen"("userId", "clientAnswerId");

-- CreateIndex
CREATE INDEX "EnDispute_status_createdAt_idx" ON "EnDispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EnDispute_questionId_status_idx" ON "EnDispute"("questionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnDispute_userId_clientAnswerId_key" ON "EnDispute"("userId", "clientAnswerId");

-- AddForeignKey
ALTER TABLE "EnSense" ADD CONSTRAINT "EnSense_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "EnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnExample" ADD CONSTRAINT "EnExample_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnPatternExample" ADD CONSTRAINT "EnPatternExample_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnPatternSense" ADD CONSTRAINT "EnPatternSense_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnPatternSense" ADD CONSTRAINT "EnPatternSense_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnQuestion" ADD CONSTRAINT "EnQuestion_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnQuestion" ADD CONSTRAINT "EnQuestion_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnQuestion" ADD CONSTRAINT "EnQuestion_exampleId_fkey" FOREIGN KEY ("exampleId") REFERENCES "EnExample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnQuestion" ADD CONSTRAINT "EnQuestion_patternExampleId_fkey" FOREIGN KEY ("patternExampleId") REFERENCES "EnPatternExample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSetItem" ADD CONSTRAINT "EnSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "EnSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSetItem" ADD CONSTRAINT "EnSetItem_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSetItem" ADD CONSTRAINT "EnSetItem_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnEnrollment" ADD CONSTRAINT "EnEnrollment_setId_fkey" FOREIGN KEY ("setId") REFERENCES "EnSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSenseSkill" ADD CONSTRAINT "EnSenseSkill_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnPatternProgress" ADD CONSTRAINT "EnPatternProgress_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnAnswerLog" ADD CONSTRAINT "EnAnswerLog_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EnQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnAudioOpen" ADD CONSTRAINT "EnAudioOpen_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EnQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnDispute" ADD CONSTRAINT "EnDispute_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EnQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
