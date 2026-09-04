"use client";

import Link from "next/link";
import { ProductCard, type ProductCardProduct } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

// ==========================================
// ÜRÜN GRİDİ
// Masaüstü 4, tablet 3, küçük tablet 2, telefon 2 sütun.
// Kartlar arasında sadece boşluk var — çerçeve yok.
// ==========================================

interface ProductGridProps {
  products: ProductCardProduct[];
  isLoading?: boolean;
  /** Ana sayfadaki vitrin gibi daha seyrek yerleşimler için */
  columns?: 3 | 4;
}

export function ProductGrid({ products, isLoading, columns = 4 }: ProductGridProps) {
  const gridClass =
    columns === 3
      ? "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3"
      : "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4";

  if (isLoading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: columns === 3 ? 6 : 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square rounded-none" />
            <Skeleton className="mt-4 h-3 w-1/3" />
            <Skeleton className="mt-2.5 h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-border px-6 py-20 text-center">
        <SearchX className="mb-4 h-7 w-7 text-muted-foreground" aria-hidden />
        <h3 className="text-base font-medium">Ürün bulunamadı</h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Aramanıza uygun ürün yok. Filtreleri sıfırlayabilir ya da kendi
          modelinizi yükleyip üretim teklifi alabilirsiniz.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/products">Filtreleri temizle</Link>
          </Button>
          <Button asChild>
            <Link href="/3d-baski-fiyati-hesapla">Kendi modelini üret</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} priority={i < 4} />
      ))}
    </div>
  );
}
