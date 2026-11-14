import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { completeThreeDS } from "@/lib/iyzico";
import { getAbsoluteUrl } from "@/lib/url";
import { markPaymentFailed, markPaymentPaid } from "@/lib/paymentResult";

// ==========================================
// POST /api/payments/3ds/callback
// Banka 3D doğrulamasından sonra iyzico müşteriyi buraya
// (form-urlencoded POST) gönderir. Gelen alanlara güvenilmez:
// ödeme yalnızca iyzico'nun /payment/3dsecure/auth yanıtı
// başarılıysa ve o yanıttaki sipariş/konuşma kimliği bizim
// bekleyen ödeme kaydımızla eşleşiyorsa "ödendi" sayılır.
// ==========================================

// mdStatus: 1 = doğrulandı; diğerleri banka tarafında reddedildi
const MD_STATUS_MESSAGE: Record<string, string> = {
  "0": "3D Secure doğrulaması başarısız oldu",
  "2": "Kart 3D Secure'a kayıtlı değil",
  "3": "Kartın bankası 3D Secure'a kayıtlı değil",
  "4": "3D Secure doğrulaması tamamlanmadı",
  "5": "3D Secure doğrulaması yapılamadı",
  "6": "3D Secure hatası",
  "7": "Banka sistem hatası",
  "8": "Bilinmeyen kart",
};

export async function POST(request: NextRequest) {
  const baseUrl = getAbsoluteUrl();
  const fail = (orderId: string | null, error: string) =>
    NextResponse.redirect(
      `${baseUrl}/checkout/failure?${orderId ? `orderId=${orderId}&` : ""}error=${encodeURIComponent(error)}`,
      { status: 303 }
    );

  try {
    const form = new URLSearchParams(await request.text());
    const status = form.get("status");
    const paymentId = form.get("paymentId");
    const conversationId = form.get("conversationId");
    const conversationData = form.get("conversationData") || undefined;
    const mdStatus = form.get("mdStatus") || "";

    if (!conversationId) return fail(null, "unknown");

    const payment = await prisma.payment.findUnique({
      where: { iyzicoConversationId: conversationId },
    });
    if (!payment) return fail(null, "unknown");

    // Aynı callback ikinci kez gelirse (yenileme/geri tuşu)
    if (payment.status === "PAID") {
      return NextResponse.redirect(
        `${baseUrl}/checkout/success?orderId=${payment.orderId}`,
        { status: 303 }
      );
    }
    if (payment.status !== "PENDING") {
      return fail(payment.orderId, payment.errorMessage || "payment_failed");
    }

    if (status !== "success" || mdStatus !== "1" || !paymentId) {
      const message = MD_STATUS_MESSAGE[mdStatus] || "3D Secure doğrulaması başarısız oldu";
      await markPaymentFailed(payment, `MD${mdStatus || "?"}`, message, {
        status,
        mdStatus,
        paymentId,
        conversationId,
      });
      return fail(payment.orderId, message);
    }

    const result = await completeThreeDS(paymentId, conversationId, conversationData);

    const matches =
      result.status === "success" &&
      result.basketId === payment.orderId &&
      (!result.conversationId || result.conversationId === conversationId) &&
      Math.round(Number(result.paidPrice) * 100) >= Math.round(Number(payment.amount) * 100);

    if (matches) {
      await markPaymentPaid(payment, result, result);
      return NextResponse.redirect(
        `${baseUrl}/checkout/success?orderId=${payment.orderId}`,
        { status: 303 }
      );
    }

    const message =
      result.status === "success"
        ? "Ödeme doğrulanamadı"
        : result.errorMessage || "Ödeme başarısız";
    console.error(
      `iyzico 3DS auth başarısız — ödeme ${payment.id}, kod ${result.errorCode ?? "eşleşme"}`
    );
    await markPaymentFailed(payment, result.errorCode, message, result);
    return fail(payment.orderId, message);
  } catch (error) {
    console.error(
      "POST /api/payments/3ds/callback error:",
      error instanceof Error ? error.message : "bilinmeyen hata"
    );
    return fail(null, "server_error");
  }
}
