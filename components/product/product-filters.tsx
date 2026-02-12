"use client";

import { useState } from "react";
import { ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, MATERIALS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ProductFiltersProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedMaterial: string;
  setSelectedMaterial: (mat: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  onReset: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function ProductFilters({
  selectedCategory,
  setSelectedCategory,
  selectedMaterial,
  setSelectedMaterial,
  priceRange,
  setPriceRange,
  onReset,
  isMobileOpen,
  setIsMobileOpen,
}: ProductFiltersProps) {
  const hasFilters = selectedCategory !== "all" || selectedMaterial !== "all" || priceRange[0] > 0 || priceRange[1] < 50000;

  const filterContent = (
    <div className="flex flex-col gap-6">
      {/* Active filters */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Aktif:</span>
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {CATEGORIES.find((c) => c.slug === selectedCategory)?.label}
              <button onClick={() => setSelectedCategory("all")} aria-label="Kategoriyi kaldir">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedMaterial !== "all" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {selectedMaterial}
              <button onClick={() => setSelectedMaterial("all")} aria-label="Malzemeyi kaldir">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={onReset}
            className="text-xs text-accent hover:underline"
          >
            Temizle
          </button>
        </div>
      )}

      {/* Categories */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Kategori</h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm transition-colors",
              selectedCategory === "all"
                ? "bg-accent/10 text-accent font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            Tum Urunler
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                selectedCategory === cat.slug
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span>{cat.label}</span>
              <span className="text-xs text-muted-foreground">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Fiyat Araligi</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={priceRange[0] || ""}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="h-9 text-sm"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={priceRange[1] === 50000 ? "" : priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 50000])}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Material */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Malzeme</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedMaterial("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selectedMaterial === "all"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
            )}
          >
            Tumu
          </button>
          {MATERIALS.map((mat) => (
            <button
              key={mat}
              onClick={() => setSelectedMaterial(mat)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedMaterial === mat
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
              )}
            >
              {mat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold font-heading">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            Filtreler
          </h2>
          {filterContent}
        </div>
      </aside>

      {/* Mobile filter button */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtreler
          {hasFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-full w-80 overflow-y-auto border-r border-border bg-card p-6 lg:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold font-heading">
                  <SlidersHorizontal className="h-4 w-4 text-accent" />
                  Filtreler
                </h2>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"
                  aria-label="Filtreleri kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {filterContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
