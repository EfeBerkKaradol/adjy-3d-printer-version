-- AlterTable: Product'a sku ve stockQty ekleniyor
ALTER TABLE "products" ADD COLUMN "sku" TEXT;
ALTER TABLE "products" ADD COLUMN "stockQty" INTEGER NOT NULL DEFAULT 999;

-- CreateIndex: sku unique constraint
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
