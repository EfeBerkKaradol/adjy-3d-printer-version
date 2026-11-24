"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import {
  useFilterState,
  type FilterCategory,
  type FilterCollection,
} from "./ProductFilters";
import { SortDropdown } from "./SortDropdown";
import { cn } from "@/lib/utils";

// ==========================================
// MAĞAZA FİLTRE MENÜSÜ
//
// Liste başlığında tek bir piksel "Filtreler" düğmesi; basınca
// altında, üst menüdeki dock açılır menüsüyle aynı buzlu camdan
// bir panel yukarıdan aşağı açılır. Filtre grupları panelde yan
// yana sütunlar hâlinde durur, her seçim hemen uygulanır (URL
// değişir, liste yenilenir) ve panel açık kalır; böylece birden
// fazla filtre art arda seçilebilir. Panel dışına tıklamak ya da
// Esc kapatır.
//
// Panel .adjy-nav taşır: sitenin piksel katmanı bu sınıfın içinde
// köşeleri yuvarlak bırakır (bkz. globals.css), cam görünümü
// üst menüyle birebir aynı kalır.
// ==========================================

interface FilterDropdownProps {
  categories: FilterCategory[];
  collections?: FilterCollection[];
  materials: { value: string; label: string }[];
  resultCount: number;
}

export function FilterDropdown({
  categories,
  collections = [],
  materials,
  resultCount,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const { current, setParams, activeCount, clearAll } = useFilterState();
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Dışarı tıklama ve Esc ile kapanır
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Element | null;
      if (!target || rootRef.current?.contains(target)) return;
      // Sıralama menüsü gibi portal içindeki açılır parçalar paneli kapatmasın
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (key: string, value: string, isOn: boolean) =>
    setParams({ [key]: isOn ? null : value });

  return (
    <div ref={rootRef} className="relative">
      {/* Araç çubuğu: filtre düğmesi, sonuç sayısı, sıralama */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-foreground/25 pb-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="magaza-filtreleri"
            className={cn(
              "adjy-pixel-box inline-flex h-9 items-center gap-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
              open
                ? "bg-foreground text-background"
                : "bg-background hover:bg-foreground hover:text-background"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filtreler
            {activeCount > 0 && (
              <span
                className={cn(
                  "flex h-4 min-w-4 items-center justify-center px-1 text-[10px] tabular-nums",
                  open ? "bg-background text-foreground" : "bg-foreground text-background"
                )}
              >
                {activeCount}
              </span>
            )}
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </button>
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">{resultCount}</span> ürün
          </p>
        </div>
        <SortDropdown />
      </div>

      {/* Buzlu açılır panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="filtre-paneli"
            id="magaza-filtreleri"
            role="region"
            aria-label="Ürün filtreleri"
            className="adjy-nav absolute inset-x-0 top-full z-30 pt-2.5"
            initial={{ opacity: 0, y: reduce ? 0 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8, transition: { duration: 0.14 } }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 34, mass: 0.8, opacity: { duration: 0.16 } }
            }
          >
            <motion.div
              className="adjy-glass adjy-glass-menu overflow-hidden rounded-[22px]"
              initial={{ clipPath: reduce ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="max-h-[min(70vh,640px)] overflow-y-auto overscroll-contain p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                  {/* Kategori */}
                  {categories.length > 0 && (
                    <Group title="Kategori">
                      {categories.map((cat) => {
                        const acik =
                          current.category === cat.slug ||
                          cat.children?.some((k) => k.slug === current.category);
                        return (
                          <div key={cat.id}>
                            <Option
                              label={cat.name}
                              count={cat.productCount}
                              selected={current.category === cat.slug}
                              onClick={() =>
                                toggle("category", cat.slug, current.category === cat.slug)
                              }
                            />
                            {(cat.children?.length ?? 0) > 1 && acik && (
                              <div className="ml-3 border-l border-foreground/10 pl-1.5 dark:border-white/10">
                                {cat.children?.map((k) => (
                                  <Option
                                    key={k.id}
                                    label={k.name}
                                    count={k.productCount}
                                    selected={current.category === k.slug}
                                    small
                                    onClick={() =>
                                      setParams({
                                        category: current.category === k.slug ? cat.slug : k.slug,
                                      })
                                    }
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </Group>
                  )}

                  {/* Koleksiyon */}
                  {collections.length > 0 && (
                    <Group title="Koleksiyon">
                      {collections.map((k) => (
                        <Option
                          key={k.id}
                          label={k.name}
                          count={k.productCount}
                          selected={current.koleksiyon === k.slug}
                          onClick={() =>
                            toggle("koleksiyon", k.slug, current.koleksiyon === k.slug)
                          }
                        />
                      ))}
                    </Group>
                  )}

                  {/* Üretim — malzeme ailesi */}
                  {materials.length > 0 && (
                    <Group title="Üretim">
                      {materials.map((m) => (
                        <Option
                          key={m.value}
                          label={m.label}
                          selected={current.material === m.value}
                          onClick={() =>
                            toggle("material", m.value, current.material === m.value)
                          }
                        />
                      ))}
                    </Group>
                  )}

                  {/* Fiyat */}
                  <Group title="Fiyat">
                    <PriceRange
                      key={`${current.minPrice}-${current.maxPrice}`}
                      initialMin={current.minPrice}
                      initialMax={current.maxPrice}
                      onApply={(min, max) =>
                        setParams({ minPrice: min || null, maxPrice: max || null })
                      }
                    />
                  </Group>

                  {/* Özellik ve durum */}
                  <Group title="Özellik">
                    <Option
                      label="Ölçüsü ayarlanabilir"
                      description="Kendi alanına göre ölçülendirilen ürünler"
                      selected={current.customizable}
                      onClick={() => toggle("customizable", "true", current.customizable)}
                    />
                    <Option
                      label="Stokta olanlar"
                      selected={current.inStock}
                      onClick={() => toggle("inStock", "true", current.inStock)}
                    />
                    <Option
                      label="Öne çıkanlar"
                      selected={current.featured}
                      onClick={() => toggle("featured", "true", current.featured)}
                    />
                  </Group>
                </div>
              </div>

              {/* Alt şerit: temizle + kapat */}
              <div className="flex items-center justify-between gap-3 border-t border-foreground/[0.07] px-4 py-3 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={activeCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-sm text-foreground/75 transition-colors hover:bg-white/45 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/[0.07]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Filtreleri temizle
                  {activeCount > 0 && <span className="tabular-nums">({activeCount})</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  <span className="tabular-nums">{resultCount}</span> ürünü göster
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Dock menüsündeki sütun gibi: buzlu karo üstünde başlık + seçenekler */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="adjy-glass-tile min-w-0 self-start rounded-[16px] p-1.5">
      <span className="block px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </span>
      <div>{children}</div>
    </div>
  );
}

function Option({
  label,
  description,
  count,
  selected,
  small = false,
  onClick,
}: {
  label: string;
  description?: string;
  count?: number;
  selected: boolean;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[12px] px-2.5 text-left transition-colors",
        small ? "py-1" : "py-1.5",
        selected
          ? "bg-white/70 text-foreground dark:bg-white/[0.12]"
          : "hover:bg-white/45 dark:hover:bg-white/[0.07]"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          selected
            ? "border-foreground bg-foreground text-background"
            : "border-foreground/25 dark:border-white/25"
        )}
        aria-hidden
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-foreground/85", small ? "text-[13px]" : "text-sm")}>
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {count !== undefined && (
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

/**
 * Fiyat aralığı. URL değişince `key` ile yeniden monte edilir;
 * alanlar effect içinde setState çağrılmadan sıfırlanır.
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

  const alan =
    "flex flex-col rounded-[12px] border border-foreground/10 bg-white/50 px-3 py-2 focus-within:border-foreground/30 dark:border-white/10 dark:bg-white/[0.05]";

  return (
    <form
      className="px-1 pb-1"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(min, max);
      }}
    >
      <div className="grid grid-cols-2 gap-1.5">
        <label className={alan}>
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">En az</span>
          <span className="mt-0.5 flex items-baseline gap-1 text-sm tabular-nums">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              aria-label="En düşük fiyat (TL)"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
            <span className="text-[11px] text-muted-foreground">TL</span>
          </span>
        </label>
        <label className={alan}>
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">En çok</span>
          <span className="mt-0.5 flex items-baseline gap-1 text-sm tabular-nums">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="∞"
              aria-label="En yüksek fiyat (TL)"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
            <span className="text-[11px] text-muted-foreground">TL</span>
          </span>
        </label>
      </div>
      <button
        type="submit"
        className="mt-1.5 w-full rounded-[12px] bg-foreground py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Fiyatı uygula
      </button>
    </form>
  );
}
