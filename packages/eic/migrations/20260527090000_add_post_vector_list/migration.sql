CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "PostVector" (
  "id" SERIAL NOT NULL,
  "post" INTEGER,
  "kind" TEXT NOT NULL DEFAULT 'document',
  "model" TEXT NOT NULL DEFAULT '',
  "dimension" INTEGER NOT NULL DEFAULT 1536,
  "sourceHash" TEXT NOT NULL DEFAULT '',
  "sourcePreview" TEXT NOT NULL DEFAULT '',
  "embedding" vector(1536),
  "embeddingGeneratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3),
  "createdBy" INTEGER,
  "updatedBy" INTEGER,
  CONSTRAINT "PostVector_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PostVector_post_idx" ON "PostVector"("post");
CREATE INDEX IF NOT EXISTS "PostVector_sourceHash_idx" ON "PostVector"("sourceHash");
CREATE INDEX IF NOT EXISTS "PostVector_createdBy_idx" ON "PostVector"("createdBy");
CREATE INDEX IF NOT EXISTS "PostVector_updatedBy_idx" ON "PostVector"("updatedBy");
CREATE UNIQUE INDEX IF NOT EXISTS "PostVector_post_kind_model_key"
ON "PostVector"("post", "kind", "model");

CREATE INDEX IF NOT EXISTS "PostVector_embedding_ivfflat_idx"
ON "PostVector"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PostVector_post_fkey'
  ) THEN
    ALTER TABLE "PostVector"
      ADD CONSTRAINT "PostVector_post_fkey"
      FOREIGN KEY ("post") REFERENCES "Post"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PostVector_createdBy_fkey'
  ) THEN
    ALTER TABLE "PostVector"
      ADD CONSTRAINT "PostVector_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PostVector_updatedBy_fkey'
  ) THEN
    ALTER TABLE "PostVector"
      ADD CONSTRAINT "PostVector_updatedBy_fkey"
      FOREIGN KEY ("updatedBy") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
