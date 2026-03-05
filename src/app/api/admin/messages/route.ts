import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

// Tüm mesajları getir
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin();
    if (isUnauthorized(authResult)) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get("unread") === "true";

        const messages = await prisma.contactMessage.findMany({
            where: unreadOnly ? { isRead: false } : {},
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("GET /api/admin/messages error:", error);
        return NextResponse.json(
            { error: "Mesajlar yüklenirken hata oluştu." },
            { status: 500 }
        );
    }
}

// Seçili mesajı okundu olarak işaretle (VEYA SİL)
export async function PATCH(request: NextRequest) {
    const authResult = await requireAdmin();
    if (isUnauthorized(authResult)) return authResult;

    try {
        const { id, isRead, isDeleted } = await request.json();

        if (!id) {
            return NextResponse.json({ error: "Geçersiz istek (ID eksik)" }, { status: 400 });
        }

        if (isDeleted) {
            await prisma.contactMessage.delete({
                where: { id },
            });
            return NextResponse.json({ success: true, message: "Mesaj silindi" });
        }

        const updated = await prisma.contactMessage.update({
            where: { id },
            data: { isRead: Boolean(isRead) },
        });

        return NextResponse.json({ success: true, message: updated });
    } catch (error) {
        console.error("PATCH /api/admin/messages error:", error);
        return NextResponse.json(
            { error: "İşlem sırasında bir hata oluştu." },
            { status: 500 }
        );
    }
}
