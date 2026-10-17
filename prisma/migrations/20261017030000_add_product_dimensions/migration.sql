-- Montajlı dış ölçü (mm). Mağaza kartında ve ürün sayfasında gösterilir.
ALTER TABLE "products" ADD COLUMN "widthMm" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "depthMm" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "heightMm" DOUBLE PRECISION;
