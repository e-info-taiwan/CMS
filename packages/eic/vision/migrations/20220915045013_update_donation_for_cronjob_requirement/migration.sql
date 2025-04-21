/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DonationPeriodTypeType" AS ENUM ('D', 'W', 'M', 'Y');

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "cronjobCheckDate" TIMESTAMP(3),
ADD COLUMN     "expectedAuthDates" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "expectedTotalAuthTimes" INTEGER DEFAULT 1,
ADD COLUMN     "expectedAuthedTimes" INTEGER DEFAULT 1,
ADD COLUMN     "failureTimes" INTEGER DEFAULT 0,
ADD COLUMN     "periodPoint" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "periodType" "DonationPeriodTypeType";
