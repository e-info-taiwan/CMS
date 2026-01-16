-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "manualOrderOfFeaturedPosts" JSONB;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "sortOrder" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "_Category_featuredPosts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Category_featuredPosts_AB_unique" ON "_Category_featuredPosts"("A", "B");

-- CreateIndex
CREATE INDEX "_Category_featuredPosts_B_index" ON "_Category_featuredPosts"("B");

-- AddForeignKey
ALTER TABLE "_Category_featuredPosts" ADD CONSTRAINT "_Category_featuredPosts_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Category_featuredPosts" ADD CONSTRAINT "_Category_featuredPosts_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
