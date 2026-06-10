-- CreateTable
CREATE TABLE "_Photo_tags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Photo_tags_AB_unique" ON "_Photo_tags"("A", "B");

-- CreateIndex
CREATE INDEX "_Photo_tags_B_index" ON "_Photo_tags"("B");

-- AddForeignKey
ALTER TABLE "_Photo_tags" ADD CONSTRAINT "_Photo_tags_A_fkey" FOREIGN KEY ("A") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Photo_tags" ADD CONSTRAINT "_Photo_tags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
