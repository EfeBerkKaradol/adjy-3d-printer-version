import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productQuerySchema } from "@/lib/validations/product";

// ==========================================
// GET /api/products
// Ürün listeleme endpoint'i.
//
// Query parametreleri:
//   ?category=ev-dekorasyon   → Kategori slug'ına göre filtrele
//   ?featured=true            → Sadece öne çıkan ürünler
//   ?search=vazo              → İsim veya açıklamada ara
//   ?minPrice=50&maxPrice=500 → Fiyat aralığı
//   ?sort=price_asc           → Sıralama
//   ?page=1&limit=12          → Sayfalama
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Query parametrelerini parse et ve validate et
    const query = productQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    // 2. Prisma where koşulunu oluştur
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isActive: true,
    };

    // [GÖREV 1]: Kategori filtresi
    if (query.category) {
      where.category = { slug: query.category };
    }

    // [GÖREV 2]: Featured filtresi
    if (query.featured) {
      where.featured = true;
    }

    // [GÖREV 3]: Search filtresi
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // [GÖREV 4]: Fiyat aralığı filtresi
    if (query.minPrice || query.maxPrice) {
      where.basePrice = {};
      if (query.minPrice) where.basePrice.gte = query.minPrice;
      if (query.maxPrice) where.basePrice.lte = query.maxPrice;
    }

    // 3. Sıralama
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { createdAt: "desc" };

    // [GÖREV 5]: Sıralama seçenekleri
    switch (query.sort) {
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
    }

    // 4. Sayfalama hesapla
    const skip = (query.page - 1) * query.limit;

    // 5. Veritabanından çek
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
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
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // 6. Response döndür
    return NextResponse.json({
      products,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / query.limit),
      },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Urunler yuklenirken bir hata olustu" },
      { status: 500 }
    );
  }
}
