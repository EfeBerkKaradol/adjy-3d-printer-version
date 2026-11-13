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
  type FilterCollection,
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
  collections?: FilterCollection[];
  materials: { value: string; label: string }[];
  resultCount: number;
}

export function FilterDrawer({
  categories,
  collections = [],
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
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-background lg:hidden">
        <div className="grid grid-cols-2 divide-x-2 divide-dashed divide-foreground/40">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex h-14 items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filtrele
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center bg-foreground px-1.5 text-[10px] tabular-nums text-background">
                {activeCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="flex h-14 items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
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
          <div className="border-b-2 border-dashed border-foreground/80 px-5 py-4">
            <SheetTitle>Filtrele</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Ürünleri kategoriye, fiyata, malzemeye ve özelleştirilebilirliğe göre filtreleyin.
          </SheetDescription>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2">
            <ProductFilters
              categories={categories}
              collections={collections}
              materials={materials}
              showHeader={false}
            />
          </div>

          <div className="border-t-2 border-dashed border-foreground/80 p-4">
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
          className="border-t-2 border-dashed border-foreground/25 bg-background p-0"
        >
          <div className="border-b-2 border-dashed border-foreground/80 px-5 py-4">
            <SheetTitle>Sırala</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Ürün listesinin sıralamasını seçin.
          </SheetDescription>
          <ul className="divide-y-2 divide-dashed divide-foreground/20 pb-2">
            {SORT_OPTIONS.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => selectSort(option.value)}
                  className="flex min-h-14 w-full items-center justify-between px-5 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
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
