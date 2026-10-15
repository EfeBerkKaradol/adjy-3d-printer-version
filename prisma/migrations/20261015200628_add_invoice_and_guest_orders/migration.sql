-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('BIREYSEL', 'KURUMSAL');

-- AlterTable
ALTER TABLE "order_addresses" ADD COLUMN     "invoiceTaxNumber" TEXT,
ADD COLUMN     "invoiceTaxOffice" TEXT,
ADD COLUMN     "invoiceTitle" TEXT,
ADD COLUMN     "invoiceType" "InvoiceType" NOT NULL DEFAULT 'BIREYSEL';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "guestToken" TEXT,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);
