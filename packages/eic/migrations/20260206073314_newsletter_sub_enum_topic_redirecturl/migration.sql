/*
  Warnings:

  - The `newsletterName` column on the `MemberSubscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `newsletterType` column on the `MemberSubscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MemberSubscriptionNewsletterNameType" AS ENUM ('daily', 'weekly');

-- CreateEnum
CREATE TYPE "MemberSubscriptionNewsletterTypeType" AS ENUM ('standard', 'styled');

-- AlterTable
ALTER TABLE "MemberSubscription" DROP COLUMN "newsletterName",
ADD COLUMN     "newsletterName" "MemberSubscriptionNewsletterNameType" DEFAULT 'daily',
DROP COLUMN "newsletterType",
ADD COLUMN     "newsletterType" "MemberSubscriptionNewsletterTypeType" DEFAULT 'standard';

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "redirectUrl" TEXT NOT NULL DEFAULT '';
