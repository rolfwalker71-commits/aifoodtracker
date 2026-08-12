-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activityLevel" "ActivityLevel" NOT NULL DEFAULT 'MODERATE',
ADD COLUMN     "autoCalculateGoals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "sex" "Sex",
ADD COLUMN     "weightKg" DOUBLE PRECISION;
