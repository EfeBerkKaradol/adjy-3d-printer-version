import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

// PUT /api/admin/categories/[categoryId] — Kategori güncelle
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ categoryId: string }> }
) {
    const authResult = await requireAdmin();
    if (isUnauthorized(authResult)) return authResult;

    const { categoryId } = await params;
    const body = await request.json();
    const { name, slug, description, imageUrl, parentId, sortOrder } = body;

    const existing = await prisma.category.findUnique({
        where: { id: categoryId },
    });

    if (!existing) {
        return NextResponse.json(
            { error: "Kategori bulunamadı" },
            { status: 404 }
        );
    }

    // Slug çakışma kontrolü (başka kategoride aynı slug var mı)
    if (slug && slug !== existing.slug) {
        const slugExists = await prisma.category.findUnique({ where: { slug } });
        if (slugExists) {
            return NextResponse.json(
                { error: "Bu slug zaten kullanılıyor" },
                { status: 409 }
            );
        }
    }

    try {
        const category = await prisma.category.update({
            where: { id: categoryId },
            data: {
                ...(name && { name }),
                ...(slug && { slug }),
                ...(description !== undefined && { description }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(parentId !== undefined && { parentId: parentId || null }),
                ...(sortOrder !== undefined && { sortOrder }),
            },
        });

        return NextResponse.json({ message: "Kategori güncellendi", category });
    } catch (error) {
        console.error("PUT /api/admin/categories error:", error);
        return NextResponse.json(
            { error: "Kategori güncellenirken hata oluştu" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/categories/[categoryId] — Kategori sil
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ categoryId: string }> }
) {
    const authResult = await requireAdmin();
    if (isUnauthorized(authResult)) return authResult;

    const { categoryId } = await params;

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { _count: { select: { products: true, children: true } } },
    });

    if (!category) {
        return NextResponse.json(
            { error: "Kategori bulunamadı" },
            { status: 404 }
        );
    }

    if (category._count.products > 0) {
        return NextResponse.json(
            {
                error: `Bu kategoride ${category._count.products} ürün bulunuyor. Önce ürünleri başka kategoriye taşıyın.`,
            },
            { status: 400 }
        );
    }

    if (category._count.children > 0) {
        return NextResponse.json(
            {
                error: `Bu kategoride ${category._count.children} alt kategori bulunuyor. Önce alt kategorileri silin.`,
            },
            { status: 400 }
        );
    }

    await prisma.category.delete({ where: { id: categoryId } });

    return NextResponse.json({ message: "Kategori silindi" });
}
