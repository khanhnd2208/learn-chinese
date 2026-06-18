-- CreateEnum
CREATE TYPE "CnContentStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "CnWordSetSource" AS ENUM ('manual', 'hsk', 'textbook');

-- CreateEnum
CREATE TYPE "CnWordProgressState" AS ENUM ('new', 'learning', 'weak', 'familiar', 'strong', 'mastered');

-- CreateEnum
CREATE TYPE "CnQuestionType" AS ENUM ('hanzi_to_meaning', 'meaning_to_hanzi', 'pinyin_to_hanzi', 'audio_to_hanzi', 'audio_to_meaning', 'audio_to_pinyin', 'fill_sentence', 'sentence_order', 'radical_pick', 'char_components', 'similar_char', 'translate_sentence');

-- CreateEnum
CREATE TYPE "CnErrorType" AS ENUM ('sai_nghia', 'sai_pinyin', 'sai_thanh_dieu', 'nghe_khong_ra', 'nham_chu', 'quen_hanzi', 'sai_mau_cau', 'sai_vi_tri', 'qua_han');

-- CreateTable
CREATE TABLE "CnSimilarGroup" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnSimilarGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnHanzi" (
    "id" TEXT NOT NULL,
    "char" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL DEFAULT '',
    "hanViet" TEXT NOT NULL DEFAULT '',
    "meaningVi" TEXT NOT NULL DEFAULT '',
    "components" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "radical" TEXT NOT NULL DEFAULT '',
    "mnemonicVi" TEXT NOT NULL DEFAULT '',
    "similarGroupId" TEXT,
    "status" "CnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnHanzi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnWord" (
    "id" TEXT NOT NULL,
    "simplified" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL DEFAULT '',
    "hanViet" TEXT NOT NULL DEFAULT '',
    "meaningVi" TEXT NOT NULL DEFAULT '',
    "partOfSpeech" TEXT NOT NULL DEFAULT '',
    "mnemonicVi" TEXT NOT NULL DEFAULT '',
    "hskLevel" INTEGER,
    "status" "CnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnWordChar" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "hanziId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CnWordChar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnExample" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "hanzi" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL DEFAULT '',
    "meaningVi" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CnExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnSentencePattern" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "samples" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "CnSentencePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnWordSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "source" "CnWordSetSource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnWordSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnWordSetItem" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "wordId" TEXT,
    "rawTerm" TEXT NOT NULL,

    CONSTRAINT "CnWordSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnWordProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "state" "CnWordProgressState" NOT NULL DEFAULT 'new',
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intervalIdx" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "meaningCorrect" INTEGER NOT NULL DEFAULT 0,
    "meaningTotal" INTEGER NOT NULL DEFAULT 0,
    "listeningCorrect" INTEGER NOT NULL DEFAULT 0,
    "listeningTotal" INTEGER NOT NULL DEFAULT 0,
    "pinyinCorrect" INTEGER NOT NULL DEFAULT 0,
    "pinyinTotal" INTEGER NOT NULL DEFAULT 0,
    "sentenceCorrect" INTEGER NOT NULL DEFAULT 0,
    "sentenceTotal" INTEGER NOT NULL DEFAULT 0,
    "charCorrect" INTEGER NOT NULL DEFAULT 0,
    "charTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CnWordProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnAnswerLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "questionType" "CnQuestionType" NOT NULL,
    "errorType" "CnErrorType",
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CnAnswerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CnSimilarGroup_key_key" ON "CnSimilarGroup"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CnHanzi_char_key" ON "CnHanzi"("char");

-- CreateIndex
CREATE INDEX "CnHanzi_status_idx" ON "CnHanzi"("status");

-- CreateIndex
CREATE INDEX "CnHanzi_similarGroupId_idx" ON "CnHanzi"("similarGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CnWord_simplified_key" ON "CnWord"("simplified");

-- CreateIndex
CREATE INDEX "CnWord_status_idx" ON "CnWord"("status");

-- CreateIndex
CREATE INDEX "CnWord_hskLevel_idx" ON "CnWord"("hskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "CnWordChar_wordId_position_key" ON "CnWordChar"("wordId", "position");

-- CreateIndex
CREATE INDEX "CnWordChar_hanziId_idx" ON "CnWordChar"("hanziId");

-- CreateIndex
CREATE INDEX "CnExample_wordId_idx" ON "CnExample"("wordId");

-- CreateIndex
CREATE INDEX "CnSentencePattern_wordId_idx" ON "CnSentencePattern"("wordId");

-- CreateIndex
CREATE INDEX "CnWordSet_userId_updatedAt_idx" ON "CnWordSet"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CnWordSetItem_setId_rawTerm_key" ON "CnWordSetItem"("setId", "rawTerm");

-- CreateIndex
CREATE INDEX "CnWordSetItem_setId_idx" ON "CnWordSetItem"("setId");

-- CreateIndex
CREATE INDEX "CnWordSetItem_wordId_idx" ON "CnWordSetItem"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "CnWordProgress_userId_wordId_key" ON "CnWordProgress"("userId", "wordId");

-- CreateIndex
CREATE INDEX "CnWordProgress_userId_dueAt_idx" ON "CnWordProgress"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "CnWordProgress_userId_state_idx" ON "CnWordProgress"("userId", "state");

-- CreateIndex
CREATE INDEX "CnAnswerLog_userId_createdAt_idx" ON "CnAnswerLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CnAnswerLog_userId_wordId_idx" ON "CnAnswerLog"("userId", "wordId");

-- CreateIndex
CREATE INDEX "CnAnswerLog_userId_errorType_idx" ON "CnAnswerLog"("userId", "errorType");

-- AddForeignKey
ALTER TABLE "CnHanzi" ADD CONSTRAINT "CnHanzi_similarGroupId_fkey" FOREIGN KEY ("similarGroupId") REFERENCES "CnSimilarGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnWordChar" ADD CONSTRAINT "CnWordChar_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnWordChar" ADD CONSTRAINT "CnWordChar_hanziId_fkey" FOREIGN KEY ("hanziId") REFERENCES "CnHanzi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnExample" ADD CONSTRAINT "CnExample_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnSentencePattern" ADD CONSTRAINT "CnSentencePattern_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnWordSetItem" ADD CONSTRAINT "CnWordSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "CnWordSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnWordSetItem" ADD CONSTRAINT "CnWordSetItem_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnWordProgress" ADD CONSTRAINT "CnWordProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnAnswerLog" ADD CONSTRAINT "CnAnswerLog_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "CnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
