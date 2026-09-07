-- AlterTable: Product'a karşılaştırma fiyatı (üstü çizili eski fiyat) ekleniyor.
-- Nullable ve varsayılansız: mevcut satırlar NULL alır, yani hiçbir ürün
-- indirimli görünmez. Veri kaybı ya da davranış değişikliği yoktur.
ALTER TABLE "products" ADD COLUMN "compareAtPrice" DECIMAL(10,2);
