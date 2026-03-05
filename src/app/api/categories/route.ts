import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

// ==========================================
// GET /api/categories
// Tüm aktif kategorileri döndürür.
// Alt kategorileri (children) de içerir.
// ==========================================

export async function GET() {
  try {
    // Cache kontrol
    const cached = await getFromCache(CACHE_KEYS.CATEGORIES);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

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

    const response = { categories };
    await setCache(CACHE_KEYS.CATEGORIES, response, CACHE_TTL.CATEGORIES);
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: "Kategoriler yuklenirken bir hata olustu" },
      { status: 500 }
    );
  }
}
