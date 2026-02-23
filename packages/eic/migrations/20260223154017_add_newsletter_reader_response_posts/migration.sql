-- AlterTable
ALTER TABLE "Newsletter" ADD COLUMN     "readerResponsePost" INTEGER;

-- CreateIndex
CREATE INDEX "Newsletter_readerResponsePost_idx" ON "Newsletter"("readerResponsePost");

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_readerResponsePost_fkey" FOREIGN KEY ("readerResponsePost") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
