import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

// ==========================================
// SİPARİŞ DURUM GEÇİŞ KURALLARI
// Her durumdan hangi durumlara geçilebileceğini tanımlar.
// ==========================================
const allowedTransitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PRINTING", "CANCELLED"],
  PRINTING: ["QUALITY_CHECK", "CANCELLED"],
  QUALITY_CHECK: ["PACKAGING", "PRINTING", "CANCELLED"], // PRINTING'e geri dönebilir (yeniden baskı)
  PACKAGING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [], // Son durum — geçiş yok
  CANCELLED: [], // Son durum — geçiş yok
};

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
    "PENDING", "CONFIRMED", "PROCESSING", "PRINTING",
    "QUALITY_CHECK", "PACKAGING", "SHIPPED", "DELIVERED", "CANCELLED",
  ];

  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Geçersiz sipariş durumu" },
      { status: 400 }
    );
  }

  // Sipariş ve ilişkili verileri çek
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { id: true, printStatus: true } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Sipariş bulunamadı" },
      { status: 404 }
    );
  }

  // Geçiş kuralı kontrolü
  const currentStatus = order.status;
  const allowed = allowedTransitions[currentStatus] || [];

  if (!allowed.includes(status)) {
    return NextResponse.json(
      {
        error: `"${currentStatus}" durumundan "${status}" durumuna geçilemez. İzin verilen: ${allowed.join(", ") || "yok (son durum)"}`,
      },
      { status: 400 }
    );
  }

  // İş mantığı kontrolleri
  // 1. CONFIRMED'a geçiş — ödeme yapılmış olmalı
  if (status === "CONFIRMED" && order.paymentStatus !== "PAID") {
    return NextResponse.json(
      { error: "Sipariş onaylanabilmesi için ödemenin tamamlanması gerekiyor" },
      { status: 400 }
    );
  }

  // 2. SHIPPED'a geçiş — tüm baskılar DONE olmalı
  if (status === "SHIPPED") {
    const unfinished = order.items.filter(
      (i) => i.printStatus !== "DONE"
    );
    if (unfinished.length > 0) {
      return NextResponse.json(
        {
          error: `Kargoya verilemez: ${unfinished.length} ürünün baskısı henüz tamamlanmadı`,
        },
        { status: 400 }
      );
    }
  }

  // Transaction ile güncelleme
  const updated = await prisma.$transaction(async (tx) => {
    // Ana sipariş durumu güncelle
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status },
    });

    // Geçmiş kaydı oluştur
    await tx.orderHistory.create({
      data: {
        orderId,
        status,
        changedBy: authResult.userId,
        notes: notes || null,
      },
    });

    // 3. PRINTING durumuna geçişte — QUEUED olan ürünleri PRINTING yap
    if (status === "PRINTING") {
      await tx.orderItem.updateMany({
        where: {
          orderId,
          printStatus: "QUEUED",
        },
        data: { printStatus: "PRINTING" },
      });
    }

    // 4. QUALITY_CHECK'e geçişte — PRINTING olan ürünleri DONE yap
    if (status === "QUALITY_CHECK") {
      await tx.orderItem.updateMany({
        where: {
          orderId,
          printStatus: "PRINTING",
        },
        data: { printStatus: "DONE" },
      });
    }

    // 5. CANCELLED — ödeme durumunu REFUNDED yap
    if (status === "CANCELLED") {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "REFUNDED" },
      });
    }

    return updatedOrder;
  });

  return NextResponse.json({
    message: `Sipariş durumu "${status}" olarak güncellendi`,
    order: {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
    },
    // Frontend'e izin verilen sonraki durumları da bildir
    allowedNextStatuses: allowedTransitions[status] || [],
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
    // Mevcut durumdan geçilebilecek durumlar
    allowedNextStatuses: allowedTransitions[order.status] || [],
  });
}
