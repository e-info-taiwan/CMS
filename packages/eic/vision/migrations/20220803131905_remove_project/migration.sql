/*
  Warnings:

  - You are about to drop the column `reporter` on the `Longform` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Longform` table. All the data in the column will be lost.
  - You are about to drop the column `poll` on the `PollOption` table. All the data in the column will be lost.
  - You are about to drop the column `project` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `startTime` on table `Poll` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endTime` on table `Poll` required. This step will fail if there are existing NULL values in that column.
  - Made the column `publishTime` on table `Poll` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "PollOption" DROP CONSTRAINT "PollOption_poll_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_project_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_updatedBy_fkey";

-- DropIndex
DROP INDEX "PollOption_poll_idx";

-- DropIndex
DROP INDEX "Post_project_idx";

-- AlterTable
ALTER TABLE "InfoGraph" ADD COLUMN     "isHomepage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LatestNew" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Longform" DROP COLUMN "reporter",
DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "description" TEXT NOT NULL DEFAULT E'',
ALTER COLUMN "startTime" SET NOT NULL,
ALTER COLUMN "endTime" SET NOT NULL,
ALTER COLUMN "publishTime" SET NOT NULL,
ALTER COLUMN "publishTime" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PollOption" DROP COLUMN "poll";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "project",
ALTER COLUMN "publishDate" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Project";

-- CreateTable
CREATE TABLE "_Poll_options" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Poll_options_AB_unique" ON "_Poll_options"("A", "B");

-- CreateIndex
CREATE INDEX "_Poll_options_B_index" ON "_Poll_options"("B");

-- AddForeignKey
ALTER TABLE "_Poll_options" ADD FOREIGN KEY ("A") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Poll_options" ADD FOREIGN KEY ("B") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
