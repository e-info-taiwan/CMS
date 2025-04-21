/*
  Warnings:

  - You are about to drop the column `host` on the `Event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" RENAME COLUMN "host" TO "hosted";
