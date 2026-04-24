-- Add pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add imageVector column to Photo table (512 dimensions for CLIP ViT-B/32)
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "imageVector" vector(512);
