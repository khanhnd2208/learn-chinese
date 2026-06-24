-- AlterEnum
ALTER TYPE "CnQuestionType" ADD VALUE IF NOT EXISTS 'fill_sentence_typed';

-- AlterTable
ALTER TABLE "CnExample" ADD COLUMN IF NOT EXISTS "meaningViTemplate" TEXT NOT NULL DEFAULT '';
