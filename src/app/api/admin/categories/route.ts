import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

// GET /api/admin/categories — Kategori listesi
export async function GET() {
    const authResult = await requireAdmin();
    if (isUnauthorized(authResult)) return authResult;

    const categories = await prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
            _count: { select: { products: true } },
            children: {
                orderBy: { sortOrder: "asc" },
                include: { _count: { select: { products: true } } },
            },
        },
        where: { parentId: null },
    });

    return NextResponse.json({ categories });
}

// POST /api/admin/categories — Yeni kategori oluştur
export async function POST(request: NextRequest) {
    const authResult = await requireAdmin();
    if (isUnauthorized(authResult)) return authResult;

    const body = await request.json();
    const { name, slug, description, imageUrl, parentId, sortOrder } = body;

    if (!name || !slug) {
        return NextResponse.json(
            { error: "Ad ve slug zorunludur" },
            { status: 400 }
        );
    }

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
        return NextResponse.json(
            { error: "Bu slug zaten kullanılıyor" },
            { status: 409 }
        );
    }

    try {
        const category = await prisma.category.create({
            data: {
                name,
                slug,
                description: description || null,
                imageUrl: imageUrl || null,
                parentId: parentId || null,
                sortOrder: sortOrder ?? 0,
            },
        });

        return NextResponse.json(
            { message: "Kategori oluşturuldu", category },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/admin/categories error:", error);
        return NextResponse.json(
            { error: "Kategori oluşturulurken hata oluştu" },
            { status: 500 }
        );
    }
}
