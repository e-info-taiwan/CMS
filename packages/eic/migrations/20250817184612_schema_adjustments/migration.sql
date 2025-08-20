-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "heroImage" INTEGER,
ADD COLUMN     "heroImageCaption" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "heroImage" INTEGER,
ADD COLUMN     "heroImageCaption" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Category_heroImage_idx" ON "Category"("heroImage");

-- CreateIndex
CREATE INDEX "Section_heroImage_idx" ON "Section"("heroImage");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_heroImage_fkey" FOREIGN KEY ("heroImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_heroImage_fkey" FOREIGN KEY ("heroImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
