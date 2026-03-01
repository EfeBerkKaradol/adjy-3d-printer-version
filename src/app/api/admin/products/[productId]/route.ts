import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { invalidateProductCache } from "@/lib/cache";

// ==========================================
// GET /api/admin/products/:productId
// Ürün detayını parametrelerle birlikte getirir
// ==========================================
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { productId } = await params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      parameters: { orderBy: { sortOrder: "asc" } },
      _count: { select: { orderItems: true, reviews: true } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({
    product: {
      ...product,
      basePrice: product.basePrice.toNumber(),
      materialWeight: product.materialWeight?.toNumber() ?? null,
    },
  });
}

// ==========================================
// PUT /api/admin/products/:productId
// Ürün bilgilerini günceller
// ==========================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { productId } = await params;
  const body = await request.json();

  const {
    name, slug, description, basePrice, categoryId,
    materialType, materialWeight, printTimeEst,
    thumbnailUrl, modelFileUrl, gallery,
    isActive, featured,
  } = body;

  try {
    // Slug çakışma kontrolü
    if (slug) {
      const existing = await prisma.product.findFirst({
        where: { slug, id: { not: productId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Bu slug zaten kullanılıyor" },
          { status: 409 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(basePrice !== undefined && { basePrice }),
        ...(categoryId !== undefined && { categoryId }),
        ...(materialType !== undefined && { materialType }),
        ...(materialWeight !== undefined && { materialWeight }),
        ...(printTimeEst !== undefined && { printTimeEst }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(modelFileUrl !== undefined && { modelFileUrl }),
        ...(gallery !== undefined && { gallery }),
        ...(isActive !== undefined && { isActive }),
        ...(featured !== undefined && { featured }),
      },
    });

    await invalidateProductCache();

    return NextResponse.json({
      message: "Ürün güncellendi",
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
      },
    });
  } catch (error) {
    console.error("PUT /api/admin/products/[productId] error:", error);
    return NextResponse.json(
      { error: "Ürün güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE /api/admin/products/:productId
// Ürünü siler (siparişi yoksa)
// ==========================================
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { productId } = await params;

  // Siparişi olan ürün silinemez
  const orderCount = await prisma.orderItem.count({
    where: { productId },
  });

  if (orderCount > 0) {
    return NextResponse.json(
      {
        error: `Bu ürünün ${orderCount} siparişi var. Silmek yerine pasif yapabilirsiniz.`,
      },
      { status: 400 }
    );
  }

  try {
    await prisma.product.delete({ where: { id: productId } });
    await invalidateProductCache();
    return NextResponse.json({ message: "Ürün silindi" });
  } catch (error) {
    console.error("DELETE /api/admin/products/[productId] error:", error);
    return NextResponse.json(
      { error: "Ürün silinirken hata oluştu" },
      { status: 500 }
    );
  }
}
