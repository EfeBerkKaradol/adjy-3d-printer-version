"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

// ==========================================
// SIRALAMA
// Değerler backend'in desteklediği sort anahtarlarıdır
// (bkz. /api/products ve products sayfası orderBy).
// ==========================================

export const SORT_OPTIONS = [
  { value: "popular", label: "Öne çıkanlar" },
  { value: "newest", label: "En yeni" },
  { value: "price_asc", label: "Fiyat: düşükten yükseğe" },
  { value: "price_desc", label: "Fiyat: yüksekten düşüğe" },
] as const;

export function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "popular";
  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === current)?.label ?? "Öne çıkanlar";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "popular") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products", { scroll: false });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-muted-foreground"
        >
          <span className="text-muted-foreground">Sırala:</span>
          <span className="font-medium">{currentLabel}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => select(option.value)}
            className="flex cursor-pointer items-center justify-between gap-2"
          >
            {option.label}
            {current === option.value && <Check className="h-4 w-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
