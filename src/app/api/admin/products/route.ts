import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const search = searchParams.get("search");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.categoryId = category;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        _count: { select: { orderItems: true, reviews: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      basePrice: p.basePrice.toNumber(),
      thumbnailUrl: p.thumbnailUrl,
      categoryName: p.category.name,
      isActive: p.isActive,
      featured: p.featured,
      materialType: p.materialType,
      orderCount: p._count.orderItems,
      reviewCount: p._count.reviews,
      createdAt: p.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// Ürün aktif/pasif + öne çıkarma
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const body = await request.json();
  const { productId, isActive, featured } = body;

  if (!productId) {
    return NextResponse.json(
      { error: "productId gerekli" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (typeof isActive === "boolean") data.isActive = isActive;
  if (typeof featured === "boolean") data.featured = featured;

  const product = await prisma.product.update({
    where: { id: productId },
    data,
    select: { id: true, name: true, isActive: true, featured: true },
  });

  return NextResponse.json({ message: "Ürün güncellendi", product });
}
