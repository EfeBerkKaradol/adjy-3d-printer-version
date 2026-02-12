"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";

// ==========================================
// ÜRÜN FİLTRE KOMPONENTİ
// Kategori, arama ve sıralama filtreleri.
// URL search params ile çalışır (SSR uyumlu).
// ==========================================

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "";
  const currentFeatured = searchParams.get("featured") === "true";

  const [searchInput, setSearchInput] = useState(currentSearch);

  // Search input değiştiğinde URL'i güncelle
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // ==========================================
  // [GÖREV 20]: updateFilter fonksiyonunu tamamla
  //
  // Bu fonksiyon, URL search params'ı güncelleyerek
  // sayfayı yeni filtrelerle yeniden yükler.
  //
  // İpucu:
  //   1. Mevcut searchParams'tan yeni bir URLSearchParams oluştur
  //   2. Eğer value boşsa, o parametreyi sil (.delete)
  //   3. Eğer value doluysa, o parametreyi set et (.set)
  //   4. "page" parametresini her zaman sil (filtre değişince sayfa 1'e döner)
  //   5. router.push(`/products?${params.toString()}`) ile yönlendir
  //
  // Java karşılığı:
  //   Spring'de @RequestParam ile aynı mantık.
  //   UriComponentsBuilder.fromPath("/products").queryParam(key, value).build()
  // ==========================================
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

  // ==========================================
  // [GÖREV 21]: handleSearch fonksiyonunu tamamla
  //
  // Form submit edildiğinde arama yapılmasını sağlar.
  //
  // İpucu:
  //   1. e.preventDefault() ile form'un default davranışını engelle
  //   2. updateFilter("search", searchInput.trim()) çağır
  //
  // Java karşılığı:
  //   Controller'da @GetMapping ile search parametresi almak gibi.
  // ==========================================
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", searchInput.trim());
  }

  // ==========================================
  // [GÖREV 22]: clearAllFilters fonksiyonunu tamamla
  //
  // Tüm filtreleri temizleyip /products sayfasına yönlendir.
  //
  // İpucu:
  //   router.push("/products") yeterli
  // ==========================================
  function clearAllFilters() {
    setSearchInput("");
    router.push("/products");
  }

  const hasActiveFilters = currentCategory || currentSearch || currentSort || currentFeatured;

  return (
    <div className="space-y-4">
      {/* Arama */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Urun ara..."
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
          Tumu
        </Button>
        <Button
          variant={currentFeatured ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("featured", currentFeatured ? "" : "true")}
        >
          ⭐ One Cikanlar
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
        <span className="text-sm text-muted-foreground">Sirala:</span>
        {[
          { value: "", label: "Varsayilan" },
          { value: "newest", label: "En Yeni" },
          { value: "price_asc", label: "Fiyat: Artan" },
          { value: "price_desc", label: "Fiyat: Azalan" },
          { value: "popular", label: "Populer" },
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

      {/* Aktif Filtreler */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Aktif filtreler:</span>
          {currentSearch && (
            <Badge variant="secondary" className="gap-1">
              Arama: {currentSearch}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("search", "")}
              />
            </Badge>
          )}
          {currentCategory && (
            <Badge variant="secondary" className="gap-1">
              Kategori: {currentCategory}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("category", "")}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-500"
            onClick={clearAllFilters}
          >
            Tumu Temizle
          </Button>
        </div>
      )}
    </div>
  );
}
