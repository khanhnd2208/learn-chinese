-- AlterTable
ALTER TABLE "CnAnswerLog" ADD COLUMN     "hintUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responseMs" INTEGER;
