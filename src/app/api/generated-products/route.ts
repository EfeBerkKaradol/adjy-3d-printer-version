import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CUSTOM_PRINT_PRODUCT_ID } from "@/lib/customPrint";

// ==========================================
// GET  /api/generated-products  → kullanıcının kaydettiği modeller
// POST /api/generated-products  → yeni model kaydı
//
// Fotoğraftan üretilen modeller ayrı bir tabloya değil, mevcut
// Customization kaydına yazılır: gizli "özel baskı" ürününe
// bağlı, parametreleri JSON olarak taşıyan bir kayıt. Böylece
// şema değiştirmeden kalıcı olurlar ve sepet/sipariş tarafı
// aynı ilişkiyi kullanmaya devam eder.
// ==========================================

const parameterSchema = z.object({
  id: z.string(),
  label: z.string(),
  hint: z.string().optional(),
  unit: z.enum(["mm", "%"]),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  value: z.number(),
  defaultValue: z.number(),
});

const saveSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(["revolve", "extrude"]),
  profile: z.array(z.number()).max(256),
  outline: z.array(z.tuple([z.number(), z.number()])).max(512),
  parameters: z.array(parameterSchema).max(24),
  dimensions: z.object({
    widthMm: z.number(),
    depthMm: z.number(),
    heightMm: z.number(),
  }),
  materialId: z.string(),
  colorId: z.string(),
  estimatedWeightGrams: z.number(),
  estimatedPrintMinutes: z.number(),
  priceGross: z.number(),
  previewImage: z.string().max(400_000).optional(),
  stlFileUrl: z.string().url().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const rows = await prisma.customization.findMany({
      where: { userId: session.user.id, productId: CUSTOM_PRINT_PRODUCT_ID },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        parameters: true,
        previewUrl: true,
        stlFileUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ models: rows });
  } catch (error) {
    console.error("GET /api/generated-products error:", error);
    return NextResponse.json({ error: "Modeller yüklenemedi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Model kaydedilemedi" }, { status: 400 });
    }

    const { previewImage, stlFileUrl, ...record } = parsed.data;

    const saved = await prisma.customization.create({
      data: {
        productId: CUSTOM_PRINT_PRODUCT_ID,
        userId: session.user.id,
        parameters: { ...record, source: "photo-to-product" },
        previewUrl: previewImage ?? null,
        stlFileUrl: stlFileUrl ?? null,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ model: saved }, { status: 201 });
  } catch (error) {
    console.error("POST /api/generated-products error:", error);
    return NextResponse.json({ error: "Model kaydedilemedi" }, { status: 500 });
  }
}
