"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

interface ProductFiltersProps {
  categories: Category[];
  materials?: string[];
}

export function ProductFilters({ categories, materials = [] }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "";
  const currentFeatured = searchParams.get("featured") === "true";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentMaterial = searchParams.get("material") || "";

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(currentMinPrice || currentMaxPrice || currentMaterial)
  );

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  function updateMultipleFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", searchInput.trim());
  }

  function handlePriceFilter() {
    updateMultipleFilters({
      minPrice: minPrice,
      maxPrice: maxPrice,
    });
  }

  function clearAllFilters() {
    setSearchInput("");
    setMinPrice("");
    setMaxPrice("");
    router.push("/products");
  }

  const hasActiveFilters =
    currentCategory || currentSearch || currentSort || currentFeatured ||
    currentMinPrice || currentMaxPrice || currentMaterial;

  return (
    <div className="space-y-4">
      {/* Arama */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ürün ara..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          Ara
        </Button>
      </form>

      {/* Kategori Filtreleri */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!currentCategory && !currentFeatured ? "default" : "outline"}
          size="sm"
          onClick={() => clearAllFilters()}
        >
          Tümü
        </Button>
        <Button
          variant={currentFeatured ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("featured", currentFeatured ? "" : "true")}
        >
          Öne Çıkanlar
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={currentCategory === cat.slug ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("category", currentCategory === cat.slug ? "" : cat.slug)}
          >
            {cat.name}
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {cat._count.products}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Sıralama */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Sırala:</span>
        {[
          { value: "", label: "Varsayılan" },
          { value: "newest", label: "En Yeni" },
          { value: "price_asc", label: "Fiyat: Artan" },
          { value: "price_desc", label: "Fiyat: Azalan" },
          { value: "popular", label: "Popüler" },
          { value: "rating", label: "En Çok Yorum" },
        ].map((option) => (
          <Button
            key={option.value}
            variant={currentSort === option.value ? "secondary" : "ghost"}
            size="sm"
            className="text-xs"
            onClick={() => updateFilter("sort", option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Gelişmiş Filtre Aç/Kapat */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        Gelişmiş Filtreler
      </button>

      {/* Gelişmiş Filtreler */}
      {showAdvanced && (
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-xl">
          {/* Fiyat Aralığı */}
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min Fiyat (TL)</label>
              <Input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-28 h-9"
                min={0}
              />
            </div>
            <span className="text-muted-foreground pb-2">—</span>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max Fiyat (TL)</label>
              <Input
                type="number"
                placeholder="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-28 h-9"
                min={0}
              />
            </div>
            <Button size="sm" variant="secondary" className="h-9" onClick={handlePriceFilter}>
              Uygula
            </Button>
          </div>

          {/* Materyal Filtresi */}
          {materials.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Materyal</label>
              <div className="flex flex-wrap gap-1.5">
                {materials.map((mat) => (
                  <Button
                    key={mat}
                    variant={currentMaterial === mat ? "default" : "outline"}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => updateFilter("material", currentMaterial === mat ? "" : mat)}
                  >
                    {mat}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aktif Filtreler */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Aktif filtreler:</span>
          {currentSearch && (
            <Badge variant="secondary" className="gap-1">
              Arama: {currentSearch}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("search", "")} />
            </Badge>
          )}
          {currentCategory && (
            <Badge variant="secondary" className="gap-1">
              Kategori: {currentCategory}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("category", "")} />
            </Badge>
          )}
          {currentMaterial && (
            <Badge variant="secondary" className="gap-1">
              Materyal: {currentMaterial}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("material", "")} />
            </Badge>
          )}
          {(currentMinPrice || currentMaxPrice) && (
            <Badge variant="secondary" className="gap-1">
              Fiyat: {currentMinPrice || "0"} - {currentMaxPrice || "max"} TL
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  updateMultipleFilters({ minPrice: "", maxPrice: "" });
                }}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-500"
            onClick={clearAllFilters}
          >
            Tümü Temizle
          </Button>
        </div>
      )}
    </div>
  );
}
