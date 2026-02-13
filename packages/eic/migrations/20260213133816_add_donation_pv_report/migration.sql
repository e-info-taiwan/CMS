-- CreateTable
CREATE TABLE "DonationPVReport" (
    "id" SERIAL NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "clickFrom" TEXT NOT NULL DEFAULT '',
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "DonationPVReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DonationPVReport_createdBy_idx" ON "DonationPVReport"("createdBy");

-- CreateIndex
CREATE INDEX "DonationPVReport_updatedBy_idx" ON "DonationPVReport"("updatedBy");

-- AddForeignKey
ALTER TABLE "DonationPVReport" ADD CONSTRAINT "DonationPVReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationPVReport" ADD CONSTRAINT "DonationPVReport_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
