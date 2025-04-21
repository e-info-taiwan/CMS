/*
  Warnings:

  - You are about to drop the column `data` on the `Longform` table. All the data in the column will be lost.
  - You are about to drop the column `video` on the `Longform` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Longform" DROP COLUMN "data",
DROP COLUMN "video",
ADD COLUMN     "byline_name" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "byline_name2" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "byline_title" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "byline_title2" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "director" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "social" TEXT NOT NULL DEFAULT E'';
