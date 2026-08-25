-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "openAiAnalysisModel" TEXT NOT NULL DEFAULT 'gpt-4o';
