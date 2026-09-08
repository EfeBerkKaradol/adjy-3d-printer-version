import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ==========================================
// GET /api/products/:slug
// Tek ürün detay endpoint'i.
// Parametreleri, kategoriyi ve review ortalamasını döndürür.
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const byId = searchParams.get("byId") === "true";

    // Slug veya ID ile ürünü bul.
    //
    // Alanlar tek tek sayılır, include kullanılmaz. include tabloda
    // o an ne varsa hepsini çeker; bu yüzden şemaya eklenmiş ama
    // veritabanına henüz uygulanmamış tek bir sütun bile bu ucu
    // 500'e düşürüp özelleştirme sayfasını tamamen çalışmaz hâle
    // getiriyordu. Burada dönen alanlar ProductDetailResponse
    // sözleşmesiyle birebir; sözleşme büyümedikçe sorgu da büyümez.
    const product = await prisma.product.findFirst({
      where: byId ? { id: slug, isActive: true } : { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        thumbnailUrl: true,
        modelFileUrl: true,
        gallery: true,
        printTimeEst: true,
        materialType: true,
        materialWeight: true,
        stockQty: true,
        featured: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        parameters: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            minValue: true,
            maxValue: true,
            defaultValue: true,
            step: true,
            unit: true,
            affectsPrice: true,
            priceFormula: true,
            affectsGeometry: true,
            validationRules: true,
            sortOrder: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    // [GÖREV 7]: Review ortalamasını hesapla
    const ratings = product.reviews.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;
    const totalReviews = ratings.length;

    // Response'u oluştur - reviews dizisini kendi objenle değiştir
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productObj = product as Record<string, any>;
    const { reviews: _reviews, ...productData } = productObj;

    return NextResponse.json({
      product: {
        ...productData,
        reviews: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalCount: totalReviews,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/products/[slug] error:", error);
    return NextResponse.json(
      { error: "Ürün detayı yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
