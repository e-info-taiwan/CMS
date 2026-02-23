/*
  Warnings:

  - You are about to drop the column `showOnHomepage` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `showOnHomepage` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the `_Tag_topics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_Tag_topics" DROP CONSTRAINT "_Tag_topics_A_fkey";

-- DropForeignKey
ALTER TABLE "_Tag_topics" DROP CONSTRAINT "_Tag_topics_B_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "showOnHomepage";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "showOnHomepage";

-- DropTable
DROP TABLE "_Tag_topics";
