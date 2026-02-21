import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// ==========================================
// POST /api/orders/[orderId]/cancel
// Siparişi iptal eder.
// Sadece PENDING veya CONFIRMED durumunda iptal edilebilir.
// ==========================================

export async function POST(
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

    // Siparişi bul
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    // Sadece PENDING veya CONFIRMED durumunda iptal edilebilir
    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      return NextResponse.json(
        {
          error: `Bu sipariş iptal edilemez. Mevcut durum: ${order.status}`,
        },
        { status: 400 }
      );
    }

    // Transaction ile güncelle
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : "FAILED",
        },
      });

      // Sipariş geçmişine ekle
      await tx.orderHistory.create({
        data: {
          orderId,
          status: "CANCELLED",
          changedBy: session.user!.id!,
          notes: "Kullanıcı tarafından iptal edildi",
        },
      });

      return updated;
    });

    return NextResponse.json({
      message: "Sipariş iptal edildi",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("POST /api/orders/[orderId]/cancel error:", error);
    return NextResponse.json(
      { error: "Sipariş iptal edilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
