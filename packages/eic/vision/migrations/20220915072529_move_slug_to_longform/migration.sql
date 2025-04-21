/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Longform` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Award" ALTER COLUMN "year" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Longform" ADD COLUMN     "slug" TEXT NOT NULL DEFAULT E'';

DROP INDEX IF EXISTS "Longform_slug_key";
CREATE UNIQUE INDEX "Longform_slug_key" ON "Longform"("slug");
