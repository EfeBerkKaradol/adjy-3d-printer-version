"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FilterCategory } from "./ProductFilters";
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
  /** Yapılandırılabilir nesne sayısı — 0 ise sekme gösterilmez */
  configurableCount?: number;
}

export function CategoryChips({
  categories,
  configurableCount = 0,
}: CategoryChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = searchParams.get("category") ?? "";
  const customizable = searchParams.get("customizable") === "true";

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

  const isAll = !current && !customizable;

  const chip = (active: boolean) =>
    cn(
      "shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm transition-colors",
      active
        ? "border-foreground font-medium text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    );

  return (
    <nav aria-label="Kategoriler" className="border-b border-border">
      <ul className="-mb-px flex gap-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li>
          <button
            type="button"
            onClick={() => go({ category: null, customizable: null })}
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
              aria-current={current === cat.slug ? "page" : undefined}
              className={chip(current === cat.slug)}
            >
              {cat.name}
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
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
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                {configurableCount}
              </span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
