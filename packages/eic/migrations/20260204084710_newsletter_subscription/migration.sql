/*
  Warnings:

  - You are about to drop the column `newsletterFrequency` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `newsletterSubscription` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `ad1` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `ad2` on the `Post` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_ad1_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_ad2_fkey";

-- DropIndex
DROP INDEX "Post_ad1_idx";

-- DropIndex
DROP INDEX "Post_ad2_idx";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "newsletterFrequency",
DROP COLUMN "newsletterSubscription";

-- AlterTable
ALTER TABLE "PollResult" ADD COLUMN     "newsletter" INTEGER;

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "ad1",
DROP COLUMN "ad2",
ADD COLUMN     "ad" INTEGER,
ADD COLUMN     "lockBy" INTEGER,
ADD COLUMN     "lockExpireAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "authorInfo" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "MemberSubscription" (
    "id" SERIAL NOT NULL,
    "newsletterName" TEXT DEFAULT 'none',
    "newsletterType" TEXT DEFAULT 'none',
    "member" INTEGER,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "MemberSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberSubscription_member_idx" ON "MemberSubscription"("member");

-- CreateIndex
CREATE INDEX "MemberSubscription_createdBy_idx" ON "MemberSubscription"("createdBy");

-- CreateIndex
CREATE INDEX "MemberSubscription_updatedBy_idx" ON "MemberSubscription"("updatedBy");

-- CreateIndex
CREATE INDEX "PollResult_newsletter_idx" ON "PollResult"("newsletter");

-- CreateIndex
CREATE INDEX "Post_lockBy_idx" ON "Post"("lockBy");

-- CreateIndex
CREATE INDEX "Post_lockExpireAt_idx" ON "Post"("lockExpireAt");

-- CreateIndex
CREATE INDEX "Post_ad_idx" ON "Post"("ad");

-- AddForeignKey
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_member_fkey" FOREIGN KEY ("member") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollResult" ADD CONSTRAINT "PollResult_newsletter_fkey" FOREIGN KEY ("newsletter") REFERENCES "Newsletter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_lockBy_fkey" FOREIGN KEY ("lockBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_ad_fkey" FOREIGN KEY ("ad") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
