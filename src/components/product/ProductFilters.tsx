"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ==========================================
// FİLTRE DURUMU
// Mağazanın filtre türleri ve URL'deki filtreleri okuyup
// yazan kanca. Panelin kendisi: FilterDropdown.tsx.
//
// Yalnızca veritabanında karşılığı olan filtreler
// gösterilir. Renk / beden / ürün tipi için Product
// modelinde alan bulunmadığından bu gruplar
// bilinçli olarak eklenmedi — çalışmayan bir filtre
// göstermek, hiç göstermemekten kötüdür.
// ==========================================

export interface FilterCategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  /** Alt kategoriler (yalnızca ürünü olanlar) */
  children?: FilterCategory[];
}

export interface FilterCollection {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

/** Ana ve alt kategorileri tek listede düzler (ad bulmak için). */
export function flattenCategories(categories: FilterCategory[]): FilterCategory[] {
  return categories.flatMap((c) => [c, ...(c.children ?? [])]);
}

export function useFilterState() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      // Filtre değişince ilk sayfaya dön
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
    },
    [router, searchParams]
  );

  const current = {
    category: searchParams.get("category") ?? "",
    koleksiyon: searchParams.get("koleksiyon") ?? "",
    material: searchParams.get("material") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    customizable: searchParams.get("customizable") === "true",
    inStock: searchParams.get("inStock") === "true",
    featured: searchParams.get("featured") === "true",
    search: searchParams.get("search") ?? "",
    sort: searchParams.get("sort") ?? "",
  };

  const activeCount =
    (current.category ? 1 : 0) +
    (current.koleksiyon ? 1 : 0) +
    (current.material ? 1 : 0) +
    (current.minPrice || current.maxPrice ? 1 : 0) +
    (current.customizable ? 1 : 0) +
    (current.inStock ? 1 : 0) +
    (current.featured ? 1 : 0) +
    (current.search ? 1 : 0);

  const clearAll = useCallback(() => {
    const sort = searchParams.get("sort");
    router.push(sort ? `/products?sort=${sort}` : "/products", { scroll: false });
  }, [router, searchParams]);

  return { current, setParams, activeCount, clearAll };
}
