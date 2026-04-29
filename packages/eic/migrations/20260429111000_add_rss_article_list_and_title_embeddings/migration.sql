CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "RssArticle" (
  "id" SERIAL NOT NULL,
  "source" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "titleEmbedding" vector(1536),
  "link" TEXT NOT NULL DEFAULT '',
  "guid" TEXT,
  "publishedAt" TIMESTAMP(3),
  "fetchedAt" TIMESTAMP(3),
  "summary" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3),
  "createdBy" INTEGER,
  "updatedBy" INTEGER,
  CONSTRAINT "RssArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RssArticle_link_key" ON "RssArticle"("link");
CREATE INDEX IF NOT EXISTS "RssArticle_createdBy_idx" ON "RssArticle"("createdBy");
CREATE INDEX IF NOT EXISTS "RssArticle_updatedBy_idx" ON "RssArticle"("updatedBy");
CREATE INDEX IF NOT EXISTS "RssArticle_titleEmbedding_ivfflat_idx"
ON "RssArticle"
USING ivfflat ("titleEmbedding" vector_cosine_ops)
WITH (lists = 100);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RssArticle_createdBy_fkey'
  ) THEN
    ALTER TABLE "RssArticle"
      ADD CONSTRAINT "RssArticle_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RssArticle_updatedBy_fkey'
  ) THEN
    ALTER TABLE "RssArticle"
      ADD CONSTRAINT "RssArticle_updatedBy_fkey"
      FOREIGN KEY ("updatedBy") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
