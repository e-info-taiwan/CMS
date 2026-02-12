-- CreateEnum
CREATE TYPE "MemberSubscriptionStatusType" AS ENUM ('active', 'disable');

-- AlterTable
ALTER TABLE "MemberSubscription" ADD COLUMN     "status" "MemberSubscriptionStatusType" DEFAULT 'active';
