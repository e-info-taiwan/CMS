-- Add text embedding vectors to Tag table.
-- textEmbedding3Small: OpenAI text-embedding-3-small, 1536 dimensions.
-- bgeM3Embedding: BGE-M3 dense embedding, 1024 dimensions.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "textEmbedding3Small" vector(1536);
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "bgeM3Embedding" vector(1024);
