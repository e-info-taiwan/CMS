/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DonationTypeType" AS ENUM ('one_time', 'periodic');

-- CreateEnum
CREATE TYPE "DonationPaymentMethodType" AS ENUM ('newebpay');

-- CreateEnum
CREATE TYPE "DonationCurrencyType" AS ENUM ('TWD');

-- CreateTable
CREATE TABLE "Donation" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL DEFAULT E'',
    "type" "DonationTypeType" NOT NULL DEFAULT E'one_time',
    "paymentMethod" "DonationPaymentMethodType" NOT NULL DEFAULT E'newebpay',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "DonationCurrencyType" NOT NULL DEFAULT E'TWD',
    "name" TEXT NOT NULL DEFAULT E'',
    "email" TEXT NOT NULL DEFAULT E'',
    "phone" TEXT NOT NULL DEFAULT E'',
    "address" TEXT NOT NULL DEFAULT E'',
    "shouldInvoice" BOOLEAN NOT NULL DEFAULT false,
    "donorTitle" TEXT NOT NULL DEFAULT E'',
    "donorSerial" TEXT NOT NULL DEFAULT E'',
    "gift" TEXT NOT NULL DEFAULT E'',
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewebpayPayment" (
    "id" SERIAL NOT NULL,
    "donation" INTEGER,
    "status" TEXT NOT NULL DEFAULT E'',
    "message" TEXT NOT NULL DEFAULT E'',
    "paymentMethod" TEXT NOT NULL DEFAULT E'',
    "amount" INTEGER NOT NULL,
    "paymentTime" TIMESTAMP(3) NOT NULL,
    "orderNumber" TEXT NOT NULL DEFAULT E'',
    "tradeNumber" TEXT NOT NULL DEFAULT E'',
    "merchantId" TEXT NOT NULL DEFAULT E'',
    "tokenUseStatus" INTEGER,
    "respondCode" TEXT NOT NULL DEFAULT E'',
    "ECI" TEXT NOT NULL DEFAULT E'',
    "authCode" TEXT NOT NULL DEFAULT E'',
    "authBank" TEXT NOT NULL DEFAULT E'',
    "cardInfoLastFour" TEXT NOT NULL DEFAULT E'',
    "cardInfoFirstSix" TEXT NOT NULL DEFAULT E'',
    "cardInfoExp" TEXT NOT NULL DEFAULT E'',
    "totalTimes" TEXT NOT NULL DEFAULT E'',
    "alreadyTimes" TEXT NOT NULL DEFAULT E'',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "NewebpayPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_orderNumber_key" ON "Donation"("orderNumber");

-- CreateIndex
CREATE INDEX "Donation_createdBy_idx" ON "Donation"("createdBy");

-- CreateIndex
CREATE INDEX "Donation_updatedBy_idx" ON "Donation"("updatedBy");

-- CreateIndex
CREATE UNIQUE INDEX "NewebpayPayment_orderNumber_key" ON "NewebpayPayment"("orderNumber");

-- CreateIndex
CREATE INDEX "NewebpayPayment_donation_idx" ON "NewebpayPayment"("donation");

-- CreateIndex
CREATE INDEX "NewebpayPayment_createdBy_idx" ON "NewebpayPayment"("createdBy");

-- CreateIndex
CREATE INDEX "NewebpayPayment_updatedBy_idx" ON "NewebpayPayment"("updatedBy");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewebpayPayment" ADD CONSTRAINT "NewebpayPayment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewebpayPayment" ADD CONSTRAINT "NewebpayPayment_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewebpayPayment" ADD CONSTRAINT "NewebpayPayment_donation_fkey" FOREIGN KEY ("donation") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
