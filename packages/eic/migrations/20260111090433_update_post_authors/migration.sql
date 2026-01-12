/*
  Warnings:

  - You are about to drop the column `author1` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `author2` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `author3` on the `Post` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_author1_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_author2_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_author3_fkey";

-- DropIndex
DROP INDEX "Post_author1_idx";

-- DropIndex
DROP INDEX "Post_author2_idx";

-- DropIndex
DROP INDEX "Post_author3_idx";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "author1",
DROP COLUMN "author2",
DROP COLUMN "author3";

-- CreateTable
CREATE TABLE "_Post_reporters" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Post_translators" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Post_reviewers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Post_writers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Post_sources" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Post_reporters_AB_unique" ON "_Post_reporters"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_reporters_B_index" ON "_Post_reporters"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Post_translators_AB_unique" ON "_Post_translators"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_translators_B_index" ON "_Post_translators"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Post_reviewers_AB_unique" ON "_Post_reviewers"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_reviewers_B_index" ON "_Post_reviewers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Post_writers_AB_unique" ON "_Post_writers"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_writers_B_index" ON "_Post_writers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Post_sources_AB_unique" ON "_Post_sources"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_sources_B_index" ON "_Post_sources"("B");

-- AddForeignKey
ALTER TABLE "_Post_reporters" ADD CONSTRAINT "_Post_reporters_A_fkey" FOREIGN KEY ("A") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_reporters" ADD CONSTRAINT "_Post_reporters_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_translators" ADD CONSTRAINT "_Post_translators_A_fkey" FOREIGN KEY ("A") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_translators" ADD CONSTRAINT "_Post_translators_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_reviewers" ADD CONSTRAINT "_Post_reviewers_A_fkey" FOREIGN KEY ("A") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_reviewers" ADD CONSTRAINT "_Post_reviewers_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_writers" ADD CONSTRAINT "_Post_writers_A_fkey" FOREIGN KEY ("A") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_writers" ADD CONSTRAINT "_Post_writers_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_sources" ADD CONSTRAINT "_Post_sources_A_fkey" FOREIGN KEY ("A") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_sources" ADD CONSTRAINT "_Post_sources_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
