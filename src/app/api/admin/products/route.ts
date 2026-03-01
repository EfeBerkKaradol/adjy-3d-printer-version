import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { invalidateProductCache } from "@/lib/cache";

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

// Yeni ürün oluştur
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const body = await request.json();
  const {
    name, slug, description, basePrice, categoryId,
    materialType, materialWeight, printTimeEst,
    thumbnailUrl, modelFileUrl,
  } = body;

  if (!name || !slug || !basePrice || !categoryId) {
    return NextResponse.json(
      { error: "Ad, slug, fiyat ve kategori zorunludur" },
      { status: 400 }
    );
  }

  // Slug çakışma kontrolü
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Bu slug zaten kullanılıyor" },
      { status: 409 }
    );
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        basePrice,
        categoryId,
        materialType: materialType || null,
        materialWeight: materialWeight || null,
        printTimeEst: printTimeEst || null,
        thumbnailUrl: thumbnailUrl || null,
        modelFileUrl: modelFileUrl || null,
      },
    });

    await invalidateProductCache();

    return NextResponse.json(
      { message: "Ürün oluşturuldu", product: { id: product.id, name: product.name, slug: product.slug } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/products error:", error);
    return NextResponse.json(
      { error: "Ürün oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
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

  await invalidateProductCache();

  return NextResponse.json({ message: "Ürün güncellendi", product });
}
