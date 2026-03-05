import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = {
  title: "Ürünler",
  description:
    "3D baskıya uygun parametrik ürünlerimizi keşfedin. Renk, boyut ve materyal seçenekleriyle kişiselleştirin.",
  openGraph: {
    title: "Ürünler | ADJY",
    description:
      "3D baskıya uygun parametrik ürünlerimizi keşfedin.",
  },
};

// ==========================================
// ÜRÜNLER SAYFASI (Server Component)
// Doğrudan Prisma ile veritabanından veri çeker.
// Vercel'de self-fetch sorunu yaşanmaz.
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

  const page = params.page ? Number(params.page) : 1;
  const limit = 12;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true };

  if (params.category) {
    where.category = { slug: params.category };
  }
  if (params.featured === "true") {
    where.featured = true;
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { createdAt: "desc" };
  switch (params.sort) {
    case "price_asc":
      orderBy = { basePrice: "asc" };
      break;
    case "price_desc":
      orderBy = { basePrice: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "popular":
      orderBy = { featured: "desc" };
      break;
    case "rating":
      orderBy = { reviews: { _count: "desc" } };
      break;
  }

  try {
    const [productsRaw, totalCount, materialsRaw, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          basePrice: true,
          thumbnailUrl: true,
          featured: true,
          materialType: true,
          printTimeEst: true,
          category: { select: { id: true, name: true, slug: true } },
          reviews: { select: { rating: true } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        where: { isActive: true, materialType: { not: null } },
        select: { materialType: true },
        distinct: ["materialType"],
      }),
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        include: {
          children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
          _count: { select: { products: true } },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    // Ortalama rating hesapla
    const products = productsRaw.map((p) => {
      const ratings = p.reviews.map((r) => r.rating);
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;
      const { reviews: _reviews, basePrice, ...rest } = p;
      return { ...rest, basePrice: Number(basePrice), averageRating: Math.round(avgRating * 10) / 10 };
    });

    const materials = materialsRaw
      .map((m) => m.materialType)
      .filter((m): m is string => m !== null);

    const totalPages = Math.ceil(totalCount / limit);

    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Urunler</h1>
          <p className="text-muted-foreground">
            3D baskiya uygun parametrik urunlerimizi kesfedin
          </p>
        </div>

        <div className="mb-8">
          <ProductFilters categories={categories} materials={materials} />
        </div>

        <ProductGrid products={products} />

        {totalPages > 1 && (
          <Suspense>
            <Pagination currentPage={page} totalPages={totalPages} />
          </Suspense>
        )}
      </div>
    );
  } catch (error) {
    console.error("Urunler yuklenirken hata:", error);
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Urunler</h1>
          <p className="text-muted-foreground">
            3D baskiya uygun parametrik urunlerimizi kesfedin
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ürünler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.</p>
        </div>
      </div>
    );
  }
}
