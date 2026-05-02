-- Add a per-submit toggle for bypassing Tag similarity validation.
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "checkSimilarity" BOOLEAN NOT NULL DEFAULT true;
