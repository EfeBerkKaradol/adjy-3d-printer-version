-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shippingMethod" TEXT;

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "iyzicoPaymentId" TEXT,
    "iyzicoConversationId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "cardLastFour" TEXT,
    "cardType" TEXT,
    "cardAssociation" TEXT,
    "installment" INTEGER NOT NULL DEFAULT 1,
    "paidAt" TIMESTAMP(3),
    "rawResponse" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_iyzicoConversationId_key" ON "payments"("iyzicoConversationId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_iyzicoConversationId_idx" ON "payments"("iyzicoConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "parameters_productId_name_key" ON "parameters"("productId", "name");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
