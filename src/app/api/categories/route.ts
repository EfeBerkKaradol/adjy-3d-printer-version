import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ==========================================
// GET /api/categories
// Tüm aktif kategorileri döndürür.
// Alt kategorileri (children) de içerir.
// ==========================================

export async function GET() {
  try {
    // TODO 🟢 [GÖREV 8]: Kategorileri veritabanından çek
    // ─────────────────────────────────────────────
    // Sadece isActive=true olan, parentId=null olan (ana kategoriler)
    // kategorileri çek. Alt kategorileri include et.
    //
    // İpucu:
    //   const categories = await prisma.category.findMany({
    //     where: { isActive: true, parentId: null },
    //     include: {
    //       children: {
    //         where: { isActive: true },
    //         orderBy: { sortOrder: "asc" },
    //       },
    //       _count: { select: { products: true } },
    //     },
    //     orderBy: { sortOrder: "asc" },
    //   });
    //
    // Kodu buraya yaz:
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: "Kategoriler yuklenirken bir hata olustu" },
      { status: 500 }
    );
  }
}
