-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "manualOrderOfReporters" JSONB,
ADD COLUMN     "manualOrderOfReviewers" JSONB,
ADD COLUMN     "manualOrderOfSources" JSONB,
ADD COLUMN     "manualOrderOfTranslators" JSONB,
ADD COLUMN     "manualOrderOfWriters" JSONB;
