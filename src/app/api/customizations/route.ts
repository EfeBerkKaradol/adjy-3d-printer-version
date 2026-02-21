import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

// ==========================================
// POST /api/customizations
// Yeni customization olusturur.
// Auth gerektirir.
// ==========================================

const createCustomizationSchema = z.object({
  productId: z.string().min(1),
  parameters: z.record(z.string(), z.union([z.number(), z.string()])),
});

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
    const parsed = createCustomizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { productId, parameters } = parsed.data;

    // Urunun varligini kontrol et
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Ürün bulunamadı" },
        { status: 404 }
      );
    }

    const customization = await prisma.customization.create({
      data: {
        productId,
        userId: session.user.id,
        parameters: parameters as Record<string, string | number>,
      },
    });

    return NextResponse.json(customization, { status: 201 });
  } catch (error) {
    console.error("POST /api/customizations error:", error);
    return NextResponse.json(
      { error: "Özelleştirme kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// ==========================================
// GET /api/customizations
// Kullanicinin customization'larini listeler.
// Auth gerektirir.
// Query: ?productId=xxx (opsiyonel)
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giris yapmaniz gerekiyor" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where: { userId: string; productId?: string } = {
      userId: session.user.id,
    };

    if (productId) {
      where.productId = productId;
    }

    const customizations = await prisma.customization.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, slug: true, thumbnailUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(customizations);
  } catch (error) {
    console.error("GET /api/customizations error:", error);
    return NextResponse.json(
      { error: "Özelleştirmeler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
