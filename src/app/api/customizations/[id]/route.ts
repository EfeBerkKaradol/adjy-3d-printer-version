import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ==========================================
// GET /api/customizations/:id
// Tek customization detayi dondurur.
// Paylasim icin auth opsiyonel.
// ==========================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customization = await prisma.customization.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnailUrl: true,
            basePrice: true,
            parameters: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!customization) {
      return NextResponse.json(
        { error: "Ozellestirme bulunamadi" },
        { status: 404 }
      );
    }

    return NextResponse.json(customization);
  } catch (error) {
    console.error("GET /api/customizations/[id] error:", error);
    return NextResponse.json(
      { error: "Ozellestirme yuklenirken bir hata olustu" },
      { status: 500 }
    );
  }
}
