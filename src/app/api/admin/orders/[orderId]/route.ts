import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

// Sipariş durumu güncelleme
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { orderId } = await params;
  const body = await request.json();
  const { status, notes } = body;

  const validStatuses = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PRINTING",
    "QUALITY_CHECK",
    "PACKAGING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Geçersiz sipariş durumu" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Sipariş bulunamadı" },
      { status: 404 }
    );
  }

  // Durum güncellemesi + geçmiş kaydı (transaction)
  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status },
    });

    await tx.orderHistory.create({
      data: {
        orderId,
        status,
        changedBy: authResult.userId,
        notes: notes || null,
      },
    });

    // Eğer CANCELLED ise ödeme durumunu da güncelle
    if (status === "CANCELLED") {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "REFUNDED" },
      });
    }

    return updatedOrder;
  });

  return NextResponse.json({
    message: "Sipariş durumu güncellendi",
    order: {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
    },
  });
}

// Sipariş detayı
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { slug: true, thumbnailUrl: true } },
        },
      },
      address: true,
      payments: true,
      history: { orderBy: { createdAt: "desc" } },
      shipment: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Sipariş bulunamadı" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    order: {
      ...order,
      totalAmount: order.totalAmount.toNumber(),
      discountAmount: order.discountAmount.toNumber(),
      taxAmount: order.taxAmount.toNumber(),
      shippingCost: order.shippingCost.toNumber(),
      grandTotal: order.grandTotal.toNumber(),
      items: order.items.map((i) => ({
        ...i,
        unitPrice: i.unitPrice.toNumber(),
        lineTotal: i.lineTotal.toNumber(),
      })),
      payments: order.payments.map((p) => ({
        ...p,
        amount: p.amount.toNumber(),
      })),
    },
  });
}
