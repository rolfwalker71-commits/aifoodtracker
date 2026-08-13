-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "GoalMode" AS ENUM ('LOSE', 'MAINTAIN', 'GAIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "goalMode" "GoalMode" NOT NULL DEFAULT 'MAINTAIN';
