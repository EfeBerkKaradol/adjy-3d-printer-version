import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { retrieveCheckoutForm } from "@/lib/iyzico";

// ==========================================
// POST /api/payments/callback
// iyzico Checkout Form callback endpoint.
//
// iyzico ödeme sonrası kullanıcının tarayıcısını
// bu URL'e POST ile yönlendirir (form-urlencoded).
// Token ile ödeme sonucunu sorgular ve günceller.
// ==========================================

export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    // ---- 1. Token'ı oku ----
    // iyzico form-urlencoded gönderir ama farklı content-type'lar da olabilir
    const rawBody = await request.text();
    let token: string | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        token = JSON.parse(rawBody).token;
      } catch {
        // JSON parse başarısız
      }
    }
    if (!token) {
      const params = new URLSearchParams(rawBody);
      token = params.get("token");
    }

    if (!token) {
      return NextResponse.redirect(
        `${baseUrl}/checkout/failure?error=token_missing`,
        { status: 303 }
      );
    }

    // ---- 2. iyzico'dan ödeme sonucunu sorgula ----
    const result = await retrieveCheckoutForm(token);

    // ---- 3. Payment kaydını bul ----
    // conversationId retrieve'da dönmeyebilir, basketId (=orderId) ile fallback
    const findPayment = async (status?: "PENDING" | "PAID" | "FAILED") => {
      let payment = null;
      if (result.conversationId) {
        payment = await prisma.payment.findUnique({
          where: { iyzicoConversationId: result.conversationId },
        });
      }
      if (!payment && result.basketId) {
        payment = await prisma.payment.findFirst({
          where: {
            orderId: result.basketId,
            ...(status ? { status } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
      }
      return payment;
    };

    // ---- 4. Başarılı ödeme ----
    if (result.status === "success") {
      const payment = await findPayment("PENDING");

      if (payment) {
        // Idempotency: aynı ödeme zaten PAID ise tekrar güncelleme
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              iyzicoPaymentId: String(result.paymentId || ""),
              status: "PAID",
              cardLastFour: result.lastFourDigits || null,
              cardType: result.cardType || null,
              cardAssociation: result.cardAssociation || null,
              installment: result.installment || 1,
              paidAt: new Date(),
              rawResponse: JSON.parse(JSON.stringify(result)),
            },
          });

          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: "PAID",
              status: "CONFIRMED",
            },
          });

          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: "CONFIRMED",
              changedBy: "system",
              notes: `Ödeme onaylandı. Kart: ****${result.lastFourDigits || "????"}`,
              metadata: JSON.parse(
                JSON.stringify({
                  paymentId: result.paymentId,
                  cardType: result.cardType,
                  cardAssociation: result.cardAssociation,
                  installment: result.installment,
                })
              ),
            },
          });
        });

        return NextResponse.redirect(
          `${baseUrl}/checkout/success?orderId=${payment.orderId}`,
          { status: 303 }
        );
      }

      // Payment bulunamadı ama ödeme başarılı — zaten işlenmiş olabilir
      // basketId ile order'ı kontrol et
      if (result.basketId) {
        const order = await prisma.order.findUnique({
          where: { id: result.basketId },
        });
        if (order?.paymentStatus === "PAID") {
          // Zaten ödenmiş, success'e yönlendir
          return NextResponse.redirect(
            `${baseUrl}/checkout/success?orderId=${order.id}`,
            { status: 303 }
          );
        }
      }
    }

    // ---- 5. Başarısız ödeme ----
    const payment = await findPayment("PENDING");

    if (payment) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            errorCode: result.errorCode || null,
            errorMessage: result.errorMessage || null,
            rawResponse: JSON.parse(JSON.stringify(result)),
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: "FAILED" },
        });

        await tx.orderHistory.create({
          data: {
            orderId: payment.orderId,
            status: "PAYMENT_FAILED",
            changedBy: "system",
            notes: result.errorMessage || "Ödeme başarısız",
          },
        });
      });

      return NextResponse.redirect(
        `${baseUrl}/checkout/failure?orderId=${payment.orderId}&error=${encodeURIComponent(result.errorMessage || "payment_failed")}`,
        { status: 303 }
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/checkout/failure?error=unknown`,
      { status: 303 }
    );
  } catch (error) {
    console.error("POST /api/payments/callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/checkout/failure?error=server_error`,
      { status: 303 }
    );
  }
}
