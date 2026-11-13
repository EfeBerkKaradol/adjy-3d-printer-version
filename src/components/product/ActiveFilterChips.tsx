"use client";

import {
  flattenCategories,
  useFilterState,
  type FilterCategory,
  type FilterCollection,
} from "./ProductFilters";
import { X } from "lucide-react";

// ==========================================
// AKTİF FİLTRE ETİKETLERİ
// Hangi filtrelerin açık olduğunu tek bakışta
// gösterir; her etiket tek tıkla kaldırılır.
// ==========================================

interface ActiveFilterChipsProps {
  categories: FilterCategory[];
  collections?: FilterCollection[];
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="adjy-pixel-box inline-flex items-center gap-1.5 bg-background py-1 pl-2.5 pr-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[10px] transition-colors hover:bg-foreground hover:text-background"
    >
      {label}
      <X className="h-3 w-3" aria-hidden />
      <span className="sr-only">filtresini kaldır</span>
    </button>
  );
}

export function ActiveFilterChips({ categories, collections = [] }: ActiveFilterChipsProps) {
  const { current, setParams, activeCount, clearAll } = useFilterState();

  if (activeCount === 0) return null;

  const categoryName =
    flattenCategories(categories).find((c) => c.slug === current.category)?.name ??
    current.category;
  const collectionName =
    collections.find((c) => c.slug === current.koleksiyon)?.name ?? current.koleksiyon;

  const priceLabel =
    current.minPrice || current.maxPrice
      ? `${current.minPrice || "0"} – ${current.maxPrice || "∞"} TL`
      : null;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {current.search && (
        <Chip
          label={`Arama: ${current.search}`}
          onRemove={() => setParams({ search: null })}
        />
      )}
      {current.category && (
        <Chip label={categoryName} onRemove={() => setParams({ category: null })} />
      )}
      {current.koleksiyon && (
        <Chip label={collectionName} onRemove={() => setParams({ koleksiyon: null })} />
      )}
      {current.customizable && (
        <Chip
          label="Özelleştirilebilir"
          onRemove={() => setParams({ customizable: null })}
        />
      )}
      {current.material && (
        <Chip
          label={current.material}
          onRemove={() => setParams({ material: null })}
        />
      )}
      {priceLabel && (
        <Chip
          label={priceLabel}
          onRemove={() => setParams({ minPrice: null, maxPrice: null })}
        />
      )}
      {current.inStock && (
        <Chip label="Stokta olanlar" onRemove={() => setParams({ inStock: null })} />
      )}
      {current.featured && (
        <Chip label="Öne çıkanlar" onRemove={() => setParams({ featured: null })} />
      )}

      <button
        type="button"
        onClick={clearAll}
        className="ml-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[10px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        Tümünü temizle
      </button>
    </div>
  );
}
