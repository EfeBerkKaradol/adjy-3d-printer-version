import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// ==========================================
// GET /api/orders/[orderId]
// Sipariş detayını getirir.
// ==========================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { orderId } = await params;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        address: true,
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            cardLastFour: true,
            cardType: true,
            cardAssociation: true,
            installment: true,
            paidAt: true,
            createdAt: true,
          },
        },
        shipment: true,
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("GET /api/orders/[orderId] error:", error);
    return NextResponse.json(
      { error: "Sipariş yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
