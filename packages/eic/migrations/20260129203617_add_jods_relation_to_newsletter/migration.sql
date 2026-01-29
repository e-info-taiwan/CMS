-- CreateTable
CREATE TABLE "_Newsletter_jobs" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Newsletter_jobs_AB_unique" ON "_Newsletter_jobs"("A", "B");

-- CreateIndex
CREATE INDEX "_Newsletter_jobs_B_index" ON "_Newsletter_jobs"("B");

-- AddForeignKey
ALTER TABLE "_Newsletter_jobs" ADD CONSTRAINT "_Newsletter_jobs_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_jobs" ADD CONSTRAINT "_Newsletter_jobs_B_fkey" FOREIGN KEY ("B") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
