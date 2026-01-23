/*
  Warnings:

  - You are about to drop the column `heroImageCaption` on the `Section` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Section" DROP COLUMN "heroImageCaption",
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';
