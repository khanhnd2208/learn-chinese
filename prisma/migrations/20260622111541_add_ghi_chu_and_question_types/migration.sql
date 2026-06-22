-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CnQuestionType" ADD VALUE 'hanzi_to_pinyin';
ALTER TYPE "CnQuestionType" ADD VALUE 'meaning_to_hanzi_typed';
ALTER TYPE "CnQuestionType" ADD VALUE 'hanzi_to_pinyin_typed';
ALTER TYPE "CnQuestionType" ADD VALUE 'audio_to_hanzi_typed';

-- AlterTable
ALTER TABLE "CnWord" ADD COLUMN     "ghiChu" TEXT NOT NULL DEFAULT '';
