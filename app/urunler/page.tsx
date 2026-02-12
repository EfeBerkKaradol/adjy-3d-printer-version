"use client";

import { useState, useMemo } from "react";
import { Search, Grid3X3, LayoutList, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { ProductFilters } from "@/components/product/product-filters";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/common/motion";
import { mockProducts } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type SortOption = "popular" | "price-asc" | "price-desc" | "newest" | "rating";

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMaterial, setSelectedMaterial] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    let filtered = mockProducts.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      const matchesMaterial =
        selectedMaterial === "all" ||
        product.material.includes(selectedMaterial);

      const matchesPrice =
        product.price >= priceRange[0] && product.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesMaterial && matchesPrice;
    });

    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        filtered.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      default:
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return filtered;
  }, [searchQuery, selectedCategory, selectedMaterial, priceRange, sortBy]);

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedMaterial("all");
    setPriceRange([0, 50000]);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen pt-20 lg:pt-24">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Page Header */}
        <ScrollReveal>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight font-heading md:text-4xl">
              Urunler
            </h1>
            <p className="mt-2 text-muted-foreground">
              {filteredProducts.length} urun listeleniyor
            </p>
          </div>
        </ScrollReveal>

        {/* Search & Sort Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ProductFilters
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedMaterial={selectedMaterial}
              setSelectedMaterial={setSelectedMaterial}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              onReset={resetFilters}
              isMobileOpen={isMobileFilterOpen}
              setIsMobileOpen={setIsMobileFilterOpen}
            />
            <div className="relative flex-1 sm:w-72 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Urun ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Siralama"
            >
              <option value="popular">Populerlik</option>
              <option value="price-asc">Fiyat: Dusukten Yuksege</option>
              <option value="price-desc">Fiyat: Yuksekten Dusuge</option>
              <option value="rating">Puan</option>
              <option value="newest">En Yeni</option>
            </select>

            <div className="hidden items-center gap-1 rounded-lg border border-border p-0.5 sm:flex">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Grid gorunum"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Liste gorunum"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <ProductFilters
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedMaterial={selectedMaterial}
            setSelectedMaterial={setSelectedMaterial}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            onReset={resetFilters}
            isMobileOpen={false}
            setIsMobileOpen={() => {}}
          />

          {/* Product Grid */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
                <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="mb-2 text-lg font-medium text-muted-foreground">
                  Urun bulunamadi
                </h3>
                <p className="mb-4 text-sm text-muted-foreground/70">
                  Farkli filtreler veya arama terimleri deneyin.
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Filtreleri Temizle
                </Button>
              </div>
            ) : (
              <StaggerContainer
                className={cn(
                  "grid gap-6",
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1"
                )}
              >
                {filteredProducts.map((product) => (
                  <StaggerItem key={product.id}>
                    <ProductCard product={product} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
