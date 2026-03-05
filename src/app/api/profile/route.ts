import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                image: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
        }

        // hasPassword kontrolü için ayrı sorgu
        const passwordCheck = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { passwordHash: true },
        });

        return NextResponse.json({
            user: {
                ...user,
                hasPassword: !!passwordCheck?.passwordHash,
            },
        });
    } catch (error) {
        console.error("GET /api/profile error:", error);
        return NextResponse.json({ error: "Profil yüklenirken hata oluştu" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
        }

        const body = await request.json();
        const { fullName, phone } = body;

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(fullName !== undefined && { fullName }),
                ...(phone !== undefined && { phone }),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                image: true,
            },
        });

        return NextResponse.json({ user: updatedUser });
    } catch (error) {
        console.error("PUT /api/profile error:", error);
        return NextResponse.json({ error: "Profil güncellenirken hata oluştu" }, { status: 500 });
    }
}
