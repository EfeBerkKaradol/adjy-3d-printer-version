"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FilterCategory, FilterCollection } from "./ProductFilters";
import { cn } from "@/lib/utils";

// ==========================================
// KATEGORİ ŞERİDİ
//
// Mağazanın üstünde yatay, tek tıkla geçilen
// kategori navigasyonu. Kenar çubuğundaki
// filtrelerin yerini almaz — onlar daraltma için,
// bu şerit keşif için.
//
// Küçük ekranda yatay kayar; kaydırma çubuğu
// gizlenir ama dokunmayla erişim korunur.
// ==========================================

interface CategoryChipsProps {
  categories: FilterCategory[];
  /** Hediye, Yılbaşı gibi koleksiyonlar (etiket) */
  collections?: FilterCollection[];
  /** Yapılandırılabilir nesne sayısı — 0 ise sekme gösterilmez */
  configurableCount?: number;
}

export function CategoryChips({
  categories,
  collections = [],
  configurableCount = 0,
}: CategoryChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = searchParams.get("category") ?? "";
  const customizable = searchParams.get("customizable") === "true";
  const koleksiyon = searchParams.get("koleksiyon") ?? "";

  // Seçili kategori bir alt kategoriyse ana kategorisi de vurgulanır
  const activeMain =
    categories.find(
      (c) => c.slug === current || c.children?.some((k) => k.slug === current)
    ) ?? null;
  const subs = activeMain?.children ?? [];

  // Telefonda seçili sekme şeridin dışında kalmasın
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current
      ?.querySelectorAll<HTMLElement>("ul > li > [aria-current='page']")
      .forEach((el) => {
        const ul = el.closest("ul");
        if (!ul || ul.scrollWidth <= ul.clientWidth) return;
        ul.scrollTo({ left: el.offsetLeft - (ul.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
      });
  }, [current, koleksiyon, customizable]);

  function go(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
  }

  const isAll = !current && !customizable && !koleksiyon;

  const chip = (active: boolean) =>
    cn(
      "shrink-0 whitespace-nowrap border-b-4 pb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
      active
        ? "border-foreground font-medium text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    );

  return (
    <nav ref={navRef} aria-label="Kategoriler" className="border-b-2 border-dashed border-foreground/30">
      <ul className="relative -mb-0.5 flex gap-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li>
          <button
            type="button"
            onClick={() => go({ category: null, customizable: null, koleksiyon: null })}
            aria-current={isAll ? "page" : undefined}
            className={chip(isAll)}
          >
            Tümü
          </button>
        </li>

        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              type="button"
              onClick={() =>
                go({
                  category: current === cat.slug ? null : cat.slug,
                  customizable: null,
                })
              }
              aria-current={activeMain?.id === cat.id ? "page" : undefined}
              className={chip(activeMain?.id === cat.id)}
            >
              {cat.name}
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {cat.productCount}
              </span>
            </button>
          </li>
        ))}

        {configurableCount > 0 && (
          <li>
            <button
              type="button"
              onClick={() =>
                go({ customizable: customizable ? null : "true", category: null })
              }
              aria-current={customizable ? "page" : undefined}
              className={chip(customizable)}
            >
              Yapılandırılabilir
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {configurableCount}
              </span>
            </button>
          </li>
        )}
      </ul>

      {/* Alt kategoriler — yalnızca seçili ana kategoride birden fazla varsa */}
      {subs.length > 1 && activeMain && (
        <ul
          aria-label={`${activeMain.name} alt kategorileri`}
          className="relative flex gap-3 overflow-x-auto px-0.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <li>
            <button
              type="button"
              onClick={() => go({ category: activeMain.slug })}
              aria-current={current === activeMain.slug ? "page" : undefined}
              className={pill(current === activeMain.slug)}
            >
              Tümü
            </button>
          </li>
          {subs.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                onClick={() => go({ category: current === k.slug ? activeMain.slug : k.slug })}
                aria-current={current === k.slug ? "page" : undefined}
                className={pill(current === k.slug)}
              >
                {k.name}
                <span className="ml-1.5 tabular-nums opacity-60">{k.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Koleksiyonlar — kategoriden bağımsız, birlikte de kullanılabilir */}
      {collections.length > 0 && !(subs.length > 1) && (
        <ul
          aria-label="Koleksiyonlar"
          className="relative flex gap-3 overflow-x-auto px-0.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {collections.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                onClick={() => go({ koleksiyon: koleksiyon === k.slug ? null : k.slug })}
                aria-current={koleksiyon === k.slug ? "page" : undefined}
                className={pill(koleksiyon === k.slug)}
              >
                {k.name}
                <span className="ml-1.5 tabular-nums opacity-60">{k.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function pill(active: boolean) {
  return cn(
    "adjy-pixel-box inline-flex min-h-8 shrink-0 items-center whitespace-nowrap px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[10px] transition-colors",
    active
      ? "bg-foreground text-background"
      : "bg-background text-muted-foreground hover:text-foreground"
  );
}
