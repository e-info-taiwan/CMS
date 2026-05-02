CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "titleEmbedding" vector(1536);

CREATE INDEX IF NOT EXISTS "Post_titleEmbedding_ivfflat_idx"
ON "Post"
USING ivfflat ("titleEmbedding" vector_cosine_ops)
WITH (lists = 100);
