-- DropIndex
DROP INDEX "PollResult_post_key";

-- CreateIndex
CREATE INDEX "PollResult_post_idx" ON "PollResult"("post");
