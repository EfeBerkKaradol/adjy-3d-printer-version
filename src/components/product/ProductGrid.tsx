"use client";

import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// ÜRÜN GRİD KOMPONENTİ
// Ürün kartlarını responsive grid'de gösterir.
// Loading state için skeleton desteği var.
// ==========================================

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  featured: boolean;
  category: { name: string; slug: string };
  _count: { reviews: number };
}

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export function ProductGrid({ products, isLoading }: ProductGridProps) {
  // Loading skeleton'ları
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  // Ürün bulunamadı
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold mb-2">Urun Bulunamadi</h3>
        <p className="text-muted-foreground">
          Aramaniza uygun urun bulunamadi. Filtreleri degistirmeyi deneyin.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
