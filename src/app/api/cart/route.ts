import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { addToCartSchema } from "@/lib/validations/cart";

// ==========================================
// GET /api/cart
// Kullanıcının sepetindeki ürünleri döndürür.
// Auth gerektirir.
// ==========================================

export async function GET() {
  try {
    // 1. Oturum kontrolü
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    // [GÖREV 11]: Kullanıcının sepet ürünlerini çek
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            thumbnailUrl: true,
          },
        },
        customization: true,
      },
      orderBy: { addedAt: "desc" },
    });

    return NextResponse.json({ cartItems });
  } catch (error) {
    console.error("GET /api/cart error:", error);
    return NextResponse.json(
      { error: "Sepet yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/cart
// Sepete ürün ekler.
// Auth gerektirir.
//
// Body: { productId, customizationId?, quantity }
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giris yapmaniz gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = addToCartSchema.parse(body);

    // [GÖREV 12]: Ürünün var olup olmadığını kontrol et
    const product = await prisma.product.findUnique({
      where: { id: validatedData.productId, isActive: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Ürün bulunamadı" },
        { status: 404 }
      );
    }

    // [GÖREV 13]: Sepete ekle veya miktarı güncelle (upsert mantığı)
    const existing = await prisma.cartItem.findFirst({
      where: {
        userId: session.user.id,
        productId: validatedData.productId,
        customizationId: validatedData.customizationId ?? null,
      },
    });

    let cartItem;

    if (existing) {
      // Zaten sepette varsa miktarı artır
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + validatedData.quantity },
        include: {
          product: { select: { name: true, basePrice: true } },
        },
      });
    } else {
      // Yoksa yeni oluştur
      cartItem = await prisma.cartItem.create({
        data: {
          userId: session.user.id,
          productId: validatedData.productId,
          customizationId: validatedData.customizationId,
          quantity: validatedData.quantity,
        },
        include: {
          product: { select: { name: true, basePrice: true } },
        },
      });
    }

    return NextResponse.json(
      { message: "Ürün sepete eklendi", cartItem },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/cart error:", error);
    return NextResponse.json(
      { error: "Sepete eklerken bir hata oluştu" },
      { status: 500 }
    );
  }
}
