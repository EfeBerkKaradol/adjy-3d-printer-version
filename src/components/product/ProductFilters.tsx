"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sliders } from "lucide-react";

// ==========================================
// FİLTRE PANELİ
// Hem masaüstü kenar çubuğunda hem de mobil
// çekmecede aynı bileşen kullanılır.
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
}

export interface ProductFiltersProps {
  categories: FilterCategory[];
  materials: string[];
  /** Çekmece içinde kullanıldığında seçim sonrası kapanır */
  onNavigate?: () => void;
  /** Çekmecenin kendi başlığı olduğu için orada gizlenir */
  showHeader?: boolean;
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

/**
 * Fiyat aralığı alanları.
 * Dışarıdan gelen değerlerle `key` verilerek monte edilir; böylece
 * URL değiştiğinde alanlar effect içinde setState çağrılmadan sıfırlanır.
 */
function PriceRange({
  initialMin,
  initialMax,
  onApply,
}: {
  initialMin: string;
  initialMax: string;
  onApply: (min: string, max: string) => void;
}) {
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);

  return (
    <>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Min"
          aria-label="En düşük fiyat (TL)"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          className="h-9"
        />
        <span className="text-muted-foreground" aria-hidden>
          —
        </span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Maks"
          aria-label="En yüksek fiyat (TL)"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          className="h-9"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full"
        onClick={() => onApply(min, max)}
      >
        Fiyatı uygula
      </Button>
    </>
  );
}

/** Etiketli onay kutusu satırı — tüm gruplar aynı ritmi kullanır */
function CheckRow({
  id,
  label,
  count,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <label
        htmlFor={id}
        className="flex flex-1 cursor-pointer items-baseline justify-between gap-3 text-sm"
      >
        <span>{label}</span>
        {count !== undefined && (
          <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
        )}
      </label>
    </div>
  );
}

export function ProductFilters({
  categories,
  materials,
  onNavigate,
  showHeader = true,
}: ProductFiltersProps) {
  const { current, setParams, activeCount, clearAll } = useFilterState();

  function update(updates: Record<string, string | null>) {
    setParams(updates);
    onNavigate?.();
  }

  return (
    <div>
      {showHeader ? (
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Sliders className="h-4 w-4" aria-hidden />
            Filtreler
            {activeCount > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({activeCount})
              </span>
            )}
          </h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                clearAll();
                onNavigate?.();
              }}
              className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Temizle
            </button>
          )}
        </div>
      ) : (
        activeCount > 0 && (
          <div className="flex justify-end pb-2">
            <button
              type="button"
              onClick={() => {
                clearAll();
                onNavigate?.();
              }}
              className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Filtreleri temizle ({activeCount})
            </button>
          </div>
        )
      )}

      <Accordion
        type="multiple"
        defaultValue={["ozellestirme", "kategori", "fiyat"]}
        className="w-full"
      >
        {/* Özelleştirme — ADJY'yi ayıran filtre, en üstte */}
        <AccordionItem value="ozellestirme" className="border-b border-border">
          <AccordionTrigger className="py-4 text-sm hover:no-underline">
            Özelleştirme
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <CheckRow
              id="f-customizable"
              label="Özelleştirilebilir"
              checked={current.customizable}
              onChange={(v) => update({ customizable: v ? "true" : null })}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Ölçüleri kendi alanına göre değiştirilebilen parametrik ürünler.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Kategori */}
        {categories.length > 0 && (
          <AccordionItem value="kategori" className="border-b border-border">
            <AccordionTrigger className="py-4 text-sm hover:no-underline">
              Kategori
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {categories.map((cat) => (
                <CheckRow
                  key={cat.id}
                  id={`f-cat-${cat.slug}`}
                  label={cat.name}
                  count={cat.productCount}
                  checked={current.category === cat.slug}
                  onChange={(v) => update({ category: v ? cat.slug : null })}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Fiyat */}
        <AccordionItem value="fiyat" className="border-b border-border">
          <AccordionTrigger className="py-4 text-sm hover:no-underline">
            Fiyat
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <PriceRange
              key={`${current.minPrice}-${current.maxPrice}`}
              initialMin={current.minPrice}
              initialMax={current.maxPrice}
              onApply={(min, max) =>
                update({ minPrice: min || null, maxPrice: max || null })
              }
            />
          </AccordionContent>
        </AccordionItem>

        {/* Malzeme */}
        {materials.length > 0 && (
          <AccordionItem value="malzeme" className="border-b border-border">
            <AccordionTrigger className="py-4 text-sm hover:no-underline">
              Malzeme
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {materials.map((mat) => (
                <CheckRow
                  key={mat}
                  id={`f-mat-${mat}`}
                  label={mat}
                  checked={current.material === mat}
                  onChange={(v) => update({ material: v ? mat : null })}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Durum */}
        <AccordionItem value="durum" className="border-b border-border">
          <AccordionTrigger className="py-4 text-sm hover:no-underline">
            Durum
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <CheckRow
              id="f-instock"
              label="Stokta olanlar"
              checked={current.inStock}
              onChange={(v) => update({ inStock: v ? "true" : null })}
            />
            <CheckRow
              id="f-featured"
              label="Öne çıkanlar"
              checked={current.featured}
              onChange={(v) => update({ featured: v ? "true" : null })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
