import { Suspense } from "react";
import { getProducts, getCategories } from "@/lib/api";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { Pagination } from "@/components/ui/pagination";

// ==========================================
// ÜRÜNLER SAYFASI (Server Component)
//
// Bu sayfa URL search params üzerinden filtre alır
// ve server-side'da API'den veri çeker.
//
// Next.js'te searchParams, server component'lerde
// otomatik olarak props olarak gelir.
//
// Java karşılığı:
//   @GetMapping("/products")
//   public String listProducts(@RequestParam Map<String,String> params, Model model)
// ==========================================

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    featured?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  // ==========================================
  // [GÖREV 23]: Ürünleri ve kategorileri API'den çek
  //
  // İpucu:
  //   1. getProducts() ve getCategories() fonksiyonlarını
  //      parallel olarak çağır (Promise.all kullanarak)
  //   2. getProducts'a URL'den gelen parametreleri aktar:
  //      - category: params.category
  //      - featured: params.featured === "true"  (string → boolean çevir)
  //      - search: params.search
  //      - sort: params.sort
  //      - page: params.page ? Number(params.page) : 1  (string → number çevir)
  //
  // Java karşılığı:
  //   CompletableFuture.allOf(productsF, categoriesF).join()
  //   yani iki async isteği aynı anda başlatıp ikisini de beklemek.
  //
  // Örnek:
  //   const [productsData, categoriesData] = await Promise.all([
  //     getProducts({ category: params.category, ... }),
  //     getCategories(),
  //   ]);
  // ==========================================
  let products: Awaited<ReturnType<typeof getProducts>>["products"] = [];
  let categories: Awaited<ReturnType<typeof getCategories>>["categories"] = [];
  let materials: string[] = [];
  let pagination = { total: 0, page: 1, limit: 12, totalPages: 1 };

  try {
    const [productsData, categoriesData] = await Promise.all([
      getProducts({
        category: params.category,
        featured: params.featured === "true",
        search: params.search,
        sort: params.sort as string | undefined,
        page: params.page ? Number(params.page) : 1,
      }),
      getCategories(),
    ]);
    products = productsData.products;
    categories = categoriesData.categories;
    materials = productsData.filters?.materials || [];
    pagination = productsData.pagination;
  } catch (error) {
    console.error("Urunler yuklenirken hata:", error);
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Urunler</h1>
        <p className="text-muted-foreground">
          3D baskiya uygun parametrik urunlerimizi kesfedin
        </p>
      </div>

      {/* Filtreler */}
      <div className="mb-8">
        <ProductFilters categories={categories} materials={materials} />
      </div>

      {/* Ürün Grid */}
      <ProductGrid products={products} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Suspense>
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} />
        </Suspense>
      )}
    </div>
  );
}
