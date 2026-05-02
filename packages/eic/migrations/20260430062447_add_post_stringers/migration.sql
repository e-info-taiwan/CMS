-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "manualOrderOfStringers" JSONB;

-- CreateTable
CREATE TABLE "_Post_stringers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Post_stringers_AB_unique" ON "_Post_stringers"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_stringers_B_index" ON "_Post_stringers"("B");

-- AddForeignKey
ALTER TABLE "_Post_stringers" ADD CONSTRAINT "_Post_stringers_A_fkey" FOREIGN KEY ("A") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_stringers" ADD CONSTRAINT "_Post_stringers_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
