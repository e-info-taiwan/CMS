/*
  Warnings:

  - Made the column `brief` on table `Post` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
UPDATE "Post" SET "brief" = '' WHERE "brief" IS NULL;
ALTER TABLE "Post" ALTER COLUMN "brief" SET NOT NULL,
ALTER COLUMN "brief" SET DEFAULT '';
