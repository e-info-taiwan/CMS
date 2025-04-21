/*
  Warnings:

  - You are about to drop the column `file_filename` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `file_filesize` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `file_mode` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Video" DROP COLUMN "file_filename",
DROP COLUMN "file_filesize",
DROP COLUMN "file_mode",
ADD COLUMN     "videoFile_filename" TEXT,
ADD COLUMN     "videoFile_filesize" INTEGER,
ADD COLUMN     "videoFile_mode" TEXT;