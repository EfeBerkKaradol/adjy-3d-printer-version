import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
        }

        const addresses = await prisma.address.findMany({
            where: { userId: session.user.id },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return NextResponse.json({ addresses });
    } catch (error) {
        console.error("GET /api/addresses error:", error);
        return NextResponse.json({ error: "Adresler yüklenirken hata oluştu" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
        }

        const body = await request.json();
        const { title, fullName, phone, addressLine, city, state, postalCode, country, type, isDefault } = body;

        if (!title || !addressLine || !city) {
            return NextResponse.json({ error: "Zorunlu alanları doldurun" }, { status: 400 });
        }

        // If setting as default, unset others first
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId: session.user.id },
                data: { isDefault: false },
            });
        }

        const address = await prisma.address.create({
            data: {
                userId: session.user.id,
                title,
                fullName: fullName || null,
                phone: phone || null,
                addressLine,
                city,
                state: state || null,
                postalCode: postalCode || null,
                country: country || "TR",
                type: type || "SHIPPING",
                isDefault: isDefault || false,
            },
        });

        return NextResponse.json({ address }, { status: 201 });
    } catch (error) {
        console.error("POST /api/addresses error:", error);
        return NextResponse.json({ error: "Adres eklenirken hata oluştu" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const addressId = searchParams.get("id");

        if (!addressId) {
            return NextResponse.json({ error: "Adres ID gerekli" }, { status: 400 });
        }

        // Check ownership
        const address = await prisma.address.findFirst({
            where: { id: addressId, userId: session.user.id },
        });

        if (!address) {
            return NextResponse.json({ error: "Adres bulunamadı" }, { status: 404 });
        }

        await prisma.address.delete({ where: { id: addressId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/addresses error:", error);
        return NextResponse.json({ error: "Adres silinirken hata oluştu" }, { status: 500 });
    }
}
