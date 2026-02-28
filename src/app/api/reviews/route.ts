import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// ==========================================
// GET /api/reviews?productId=xxx
// Ürüne ait değerlendirmeleri listeler.
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");

    if (!productId) {
      return NextResponse.json(
        { error: "productId gerekli" },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    const [reviews, totalCount, stats] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: {
          user: {
            select: { fullName: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { productId } }),
      prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    // Puan dağılımı
    const distribution = await prisma.review.groupBy({
      by: ["rating"],
      where: { productId },
      _count: { rating: true },
    });

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      ratingDistribution[d.rating] = d._count.rating;
    });

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        verifiedPurchase: r.verifiedPurchase,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt,
        user: {
          fullName: r.user.fullName || "Anonim",
          image: r.user.image,
        },
      })),
      stats: {
        averageRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        totalCount: stats._count.rating,
        distribution: ratingDistribution,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json(
      { error: "Değerlendirmeler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/reviews
// Yeni değerlendirme oluşturur.
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, rating, title, comment } = body;

    if (!productId || !rating) {
      return NextResponse.json(
        { error: "Ürün ID ve puan gerekli" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Puan 1-5 arasında olmalıdır" },
        { status: 400 }
      );
    }

    // Daha önce değerlendirme yapılmış mı?
    const existing = await prisma.review.findFirst({
      where: {
        productId,
        userId: session.user.id,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu ürünü daha önce değerlendirdiniz" },
        { status: 409 }
      );
    }

    // Doğrulanmış satın alma kontrolü
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId: session.user.id,
          status: { in: ["DELIVERED", "SHIPPED"] },
        },
      },
    });

    const review = await prisma.review.create({
      data: {
        productId,
        userId: session.user.id,
        rating,
        title: title || null,
        comment: comment || null,
        verifiedPurchase: !!hasPurchased,
      },
      include: {
        user: { select: { fullName: true, image: true } },
      },
    });

    return NextResponse.json(
      {
        message: "Değerlendirmeniz kaydedildi",
        review: {
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          verifiedPurchase: review.verifiedPurchase,
          createdAt: review.createdAt,
          user: {
            fullName: review.user.fullName || "Anonim",
            image: review.user.image,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { error: "Değerlendirme kaydedilirken hata oluştu" },
      { status: 500 }
    );
  }
}
