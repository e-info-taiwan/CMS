-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "style" TEXT DEFAULT 'default';

-- CreateTable
CREATE TABLE "_Category_columnClassifyTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Section_columnCategoryTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Category_columnClassifyTags_AB_unique" ON "_Category_columnClassifyTags"("A", "B");

-- CreateIndex
CREATE INDEX "_Category_columnClassifyTags_B_index" ON "_Category_columnClassifyTags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Section_columnCategoryTags_AB_unique" ON "_Section_columnCategoryTags"("A", "B");

-- CreateIndex
CREATE INDEX "_Section_columnCategoryTags_B_index" ON "_Section_columnCategoryTags"("B");

-- AddForeignKey
ALTER TABLE "_Category_columnClassifyTags" ADD CONSTRAINT "_Category_columnClassifyTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Category_columnClassifyTags" ADD CONSTRAINT "_Category_columnClassifyTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Classify"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Section_columnCategoryTags" ADD CONSTRAINT "_Section_columnCategoryTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Section_columnCategoryTags" ADD CONSTRAINT "_Section_columnCategoryTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
