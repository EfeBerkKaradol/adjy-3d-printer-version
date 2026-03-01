import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { toggleWishlistSchema } from "@/lib/validations/wishlist";

// GET /api/wishlist — Kullanıcının favori ürünlerini listele
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  const wishlist = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          thumbnailUrl: true,
          featured: true,
          materialType: true,
          category: { select: { name: true, slug: true } },
          reviews: { select: { rating: true } },
          _count: { select: { reviews: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Ortalama rating hesapla
  const items = wishlist.map((w) => {
    const ratings = w.product.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;
    const { reviews: _reviews, ...product } = w.product;
    return {
      id: w.id,
      createdAt: w.createdAt.toISOString(),
      product: { ...product, basePrice: Number(product.basePrice), averageRating: avgRating },
    };
  });

  return NextResponse.json({ wishlist: items });
}

// POST /api/wishlist — Favori ekle/çıkar (toggle)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = toggleWishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const { productId } = parsed.data;
  const userId = session.user.id;

  // Ürün var mı kontrol et
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  // Toggle: varsa sil, yoksa ekle
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed", productId });
  } else {
    await prisma.wishlist.create({ data: { userId, productId } });
    return NextResponse.json({ action: "added", productId });
  }
}
