import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { initializeCheckoutForm } from "@/lib/iyzico";
import { prepareOrderPayment } from "@/lib/paymentOrder";
import { getAbsoluteUrl } from "@/lib/url";

// ==========================================
// POST /api/payments/initialize
// iyzico'nun hazır ödeme sayfası (Checkout Form).
// Sitenin kendi piksel kart formu çalışmazsa yedek yol
// olarak durur; sipariş/sepet kuralları lib/paymentOrder'da.
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const { orderId, guestToken } = await request.json();

    const prepared = await prepareOrderPayment(request, orderId, guestToken);
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    }

    const result = await initializeCheckoutForm({
      ...prepared.params,
      callbackUrl: `${getAbsoluteUrl()}/api/payments/callback`,
    });

    if (result.status !== "success") {
      // Hata kodu olmadan günlükten ayırt edilemiyordu: 9000 (üye
      // işyeri ödeme almaya yetkili değil) ile sepet/alıcı
      // doğrulama hataları aynı satıra düşüyordu.
      console.error(
        `iyzico initialize başarısız — sipariş ${prepared.orderNumber}, kod ${
          result.errorCode ?? "?"
        }: ${result.errorMessage ?? "mesaj yok"}`
      );
      return NextResponse.json(
        {
          error: "Ödeme başlatılamadı",
          code: result.errorCode ?? null,
          details: result.errorMessage ?? null,
        },
        { status: 502 }
      );
    }

    await prisma.payment.create({
      data: {
        orderId: prepared.orderId,
        iyzicoConversationId: prepared.conversationId,
        amount: Number(prepared.amount),
        currency: "TRY",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      checkoutFormContent: result.checkoutFormContent,
      token: result.token,
      conversationId: prepared.conversationId,
    });
  } catch (error) {
    console.error("POST /api/payments/initialize error:", error);
    return NextResponse.json(
      { error: "Ödeme başlatılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
