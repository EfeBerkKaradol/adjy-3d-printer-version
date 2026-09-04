"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ProductFilters,
  useFilterState,
  type FilterCategory,
} from "./ProductFilters";
import { SORT_OPTIONS } from "./SortDropdown";
import { ArrowDownUp, Check, SlidersHorizontal } from "lucide-react";

// ==========================================
// MOBİL FİLTRE / SIRALAMA
// Ekranın altında sabit duran iki düğme; her biri
// tam ekran bir çekmece açar. Masaüstündeki kenar
// çubuğunun küçültülmüş hâli değil, ayrı bir çözüm.
// ==========================================

interface FilterDrawerProps {
  categories: FilterCategory[];
  materials: string[];
  resultCount: number;
}

export function FilterDrawer({
  categories,
  materials,
  resultCount,
}: FilterDrawerProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const { activeCount } = useFilterState();

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "popular";

  function selectSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "popular") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
    setSortOpen(false);
  }

  return (
    <>
      {/* Alt sabit çubuk */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-2 divide-x divide-border">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex h-14 items-center justify-center gap-2 text-sm font-medium"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filtrele
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] tabular-nums text-primary-foreground">
                {activeCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="flex h-14 items-center justify-center gap-2 text-sm font-medium"
          >
            <ArrowDownUp className="h-4 w-4" aria-hidden />
            Sırala
          </button>
        </div>
      </div>

      {/* Filtre çekmecesi — tam ekran */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-md"
        >
          <div className="border-b border-border px-5 py-4">
            <SheetTitle className="text-base font-semibold">Filtrele</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Ürünleri kategoriye, fiyata, malzemeye ve özelleştirilebilirliğe göre filtreleyin.
          </SheetDescription>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2">
            <ProductFilters
              categories={categories}
              materials={materials}
              showHeader={false}
            />
          </div>

          <div className="border-t border-border p-4">
            <Button size="lg" className="w-full" onClick={() => setFiltersOpen(false)}>
              {resultCount} ürünü göster
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sıralama çekmecesi */}
      <Sheet open={sortOpen} onOpenChange={setSortOpen}>
        <SheetContent
          side="bottom"
          className="border-t border-border bg-background p-0"
        >
          <div className="border-b border-border px-5 py-4">
            <SheetTitle className="text-base font-semibold">Sırala</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Ürün listesinin sıralamasını seçin.
          </SheetDescription>
          <ul className="divide-y divide-border pb-2">
            {SORT_OPTIONS.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => selectSort(option.value)}
                  className="flex min-h-14 w-full items-center justify-between px-5 text-left text-sm"
                >
                  {option.label}
                  {currentSort === option.value && (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
