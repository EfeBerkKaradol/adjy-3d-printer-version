import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { FilterDrawer } from "@/components/product/FilterDrawer";
import { SortDropdown } from "@/components/product/SortDropdown";
import { ActiveFilterChips } from "@/components/product/ActiveFilterChips";
import { CategoryChips } from "@/components/product/CategoryChips";
import { Pagination } from "@/components/ui/pagination";

// ==========================================
// MAĞAZA (Server Component)
// Solda filtre kenar çubuğu, sağda ürün listesi.
// Veri doğrudan Prisma ile okunur — Vercel'de
// self-fetch sorunu yaşanmaz.
// ==========================================

export const metadata: Metadata = {
  title: "Mağaza",
  description:
    "ADJY ürünlerini keşfedin. Parametrik ürünlerin ölçülerini kendi alanınıza göre değiştirin, AR ile önizleyin ve satın alın.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Mağaza | ADJY",
    description: "ADJY ürünlerini keşfedin — çoğu ölçüsü değiştirilebilir parametrik ürün.",
  },
};

const PAGE_SIZE = 12;

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    featured?: string;
    customizable?: string;
    inStock?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

function buildOrderBy(sort?: string) {
  switch (sort) {
    case "price_asc":
      return { basePrice: "asc" as const };
    case "price_desc":
      return { basePrice: "desc" as const };
    case "newest":
      return { createdAt: "desc" as const };
    case "rating":
      return { reviews: { _count: "desc" as const } };
    case "popular":
    default:
      return [{ featured: "desc" as const }, { createdAt: "desc" as const }];
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true };

  if (params.category) where.category = { slug: params.category };
  if (params.featured === "true") where.featured = true;
  if (params.inStock === "true") where.stockQty = { gt: 0 };
  // Parametrik ürün = en az bir Parameter kaydı olan ürün
  if (params.customizable === "true") where.parameters = { some: {} };
  if (params.material) {
    where.materialType = { equals: params.material, mode: "insensitive" };
  }
  if (params.minPrice || params.maxPrice) {
    where.basePrice = {};
    const min = Number(params.minPrice);
    const max = Number(params.maxPrice);
    if (Number.isFinite(min) && params.minPrice) where.basePrice.gte = min;
    if (Number.isFinite(max) && params.maxPrice) where.basePrice.lte = max;
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }

  let products: Awaited<ReturnType<typeof loadProducts>>["products"] = [];
  let totalCount = 0;
  let categories: { id: string; name: string; slug: string; productCount: number }[] = [];
  let materials: string[] = [];
  let configurableCount = 0;
  let failed = false;

  async function loadProducts() {
    const [rows, count, materialRows, configurableCount, categoryRows] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: buildOrderBy(params.sort),
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          basePrice: true,
          thumbnailUrl: true,
          featured: true,
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { reviews: true, parameters: true } },
        },
      }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        where: { isActive: true, materialType: { not: null } },
        select: { materialType: true },
        distinct: ["materialType"],
      }),
      prisma.product.count({
        where: { isActive: true, parameters: { some: {} } },
      }),
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          // Yalnızca aktif ürünler sayılır — aksi hâlde şeritteki sayı
          // ile listedeki sonuç sayısı birbirini tutmuyor
          _count: { select: { products: { where: { isActive: true } } } },
        },
      }),
    ]);

    return {
      products: rows.map((p) => ({ ...p, basePrice: Number(p.basePrice) })),
      count,
      configurableCount,
      materials: materialRows
        .map((m) => m.materialType)
        .filter((m): m is string => Boolean(m))
        .sort(),
      categories: categoryRows
        .filter((c) => c._count.products > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          productCount: c._count.products,
        })),
    };
  }

  try {
    const data = await loadProducts();
    products = data.products;
    totalCount = data.count;
    materials = data.materials;
    categories = data.categories;
    configurableCount = data.configurableCount;
  } catch (error) {
    console.error("Ürünler yüklenirken hata:", error);
    failed = true;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="adjy-container py-10 pb-24 md:py-14 lg:pb-14">
      {/* Başlık */}
      <header className="max-w-2xl">
        <p className="adjy-eyebrow mb-4">Mağaza</p>
        <h1 className="adjy-display text-[clamp(2rem,4vw,3rem)]">
          Nesneleri keşfet
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Üretime hazır ADJY nesneleri. Çoğu parametrik — beğendiğini kendi
          ölçünde de ürettirebilirsin.
        </p>
      </header>

      <div className="mt-10 md:mt-12">
        <Suspense fallback={<div className="h-12" />}>
          <CategoryChips
            categories={categories}
            configurableCount={configurableCount}
          />
        </Suspense>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-14">
        {/* Kenar çubuğu — masaüstü */}
        <aside className="hidden lg:block" aria-label="Ürün filtreleri">
          <div className="sticky top-24">
            <Suspense fallback={<div className="h-96" />}>
              <ProductFilters categories={categories} materials={materials} />
            </Suspense>
          </div>
        </aside>

        {/* Liste */}
        <div>
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">
                {totalCount}
              </span>{" "}
              ürün
            </p>
            <div className="hidden lg:block">
              <Suspense fallback={null}>
                <SortDropdown />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={null}>
            <ActiveFilterChips categories={categories} />
          </Suspense>

          <div className="mt-8">
            {failed ? (
              <div className="border border-dashed border-border px-6 py-20 text-center">
                <p className="text-base font-medium">Ürünler yüklenemedi</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Bağlantı sorunu olabilir. Lütfen sayfayı yenileyin.
                </p>
              </div>
            ) : (
              <ProductGrid products={products} />
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-14">
              <Suspense>
                <Pagination currentPage={page} totalPages={totalPages} />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* Mobil filtre / sıralama */}
      <Suspense fallback={null}>
        <FilterDrawer
          categories={categories}
          materials={materials}
          resultCount={totalCount}
        />
      </Suspense>
    </div>
  );
}
