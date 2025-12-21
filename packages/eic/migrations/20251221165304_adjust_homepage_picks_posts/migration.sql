/*
  Warnings:

  - You are about to drop the `_HomepagePick_posts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_HomepagePick_posts" DROP CONSTRAINT "_HomepagePick_posts_A_fkey";

-- DropForeignKey
ALTER TABLE "_HomepagePick_posts" DROP CONSTRAINT "_HomepagePick_posts_B_fkey";

-- AlterTable
ALTER TABLE "HomepagePick" ADD COLUMN     "posts" INTEGER;

-- DropTable
DROP TABLE "_HomepagePick_posts";

-- CreateIndex
CREATE INDEX "HomepagePick_posts_idx" ON "HomepagePick"("posts");

-- AddForeignKey
ALTER TABLE "HomepagePick" ADD CONSTRAINT "HomepagePick_posts_fkey" FOREIGN KEY ("posts") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
