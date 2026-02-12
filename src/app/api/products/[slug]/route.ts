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

    // Slug veya ID ile ürünü bul
    const product = await prisma.product.findUnique({
      where: byId ? { id: slug, isActive: true } : { slug, isActive: true },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        parameters: {
          orderBy: { sortOrder: "asc" },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Urun bulunamadi" }, { status: 404 });
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
      { error: "Urun detayi yuklenirken bir hata olustu" },
      { status: 500 }
    );
  }
}
