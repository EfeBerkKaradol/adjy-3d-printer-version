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
// Liste başlığında iki piksel düğme; her biri
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
      {/* Liste başlığındaki iki piksel düğme — yalnızca mobil/tablet.
          Eskiden ekranın altında sabit bir çubuktu; çerez çubuğunun
          altında kalıp görünmüyordu. */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="adjy-pixel-box inline-flex h-9 items-center gap-2 bg-foreground px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-background"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filtrele
          {activeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center bg-background px-1 text-[10px] tabular-nums text-foreground">
              {activeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          className="adjy-pixel-box inline-flex h-9 items-center gap-2 bg-background px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
        >
          <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
          Sırala
        </button>
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
