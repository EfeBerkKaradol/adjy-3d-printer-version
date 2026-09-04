"use client";

import { useFilterState, type FilterCategory } from "./ProductFilters";
import { X } from "lucide-react";

// ==========================================
// AKTİF FİLTRE ETİKETLERİ
// Hangi filtrelerin açık olduğunu tek bakışta
// gösterir; her etiket tek tıkla kaldırılır.
// ==========================================

interface ActiveFilterChipsProps {
  categories: FilterCategory[];
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full border border-border py-1.5 pl-3 pr-2.5 text-xs transition-colors hover:bg-surface"
    >
      {label}
      <X className="h-3 w-3 text-muted-foreground" aria-hidden />
      <span className="sr-only">filtresini kaldır</span>
    </button>
  );
}

export function ActiveFilterChips({ categories }: ActiveFilterChipsProps) {
  const { current, setParams, activeCount, clearAll } = useFilterState();

  if (activeCount === 0) return null;

  const categoryName =
    categories.find((c) => c.slug === current.category)?.name ?? current.category;

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
        className="ml-1 text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        Tümünü temizle
      </button>
    </div>
  );
}
