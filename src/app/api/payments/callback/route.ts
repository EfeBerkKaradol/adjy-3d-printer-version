import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { retrieveCheckoutForm } from "@/lib/iyzico";
import { getAbsoluteUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { CUSTOM_PRINT_SLUG, isCustomPrintParams } from "@/lib/customPrint";
import { LAYER_HEIGHTS } from "@/lib/slicer";

// Müşteri yüklemesi (özel baskı) siparişlerinin dosya + özelleştirme
// bilgilerinin gönderileceği üretim e-postası
const CUSTOM_ORDER_NOTIFY_EMAIL =
  process.env.CUSTOM_ORDER_NOTIFY_EMAIL || "efeberkkaradol@gmail.com";

/**
 * Ödemesi tamamlanan siparişte müşterinin kendi yüklediği model varsa
 * dosya bağlantısını ve tüm baskı özelleştirmelerini üretim e-postasına
 * iletir. Sitedeki normal ürünler e-postaya dahil edilmez.
 */
async function notifyCustomPrintItems(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { fullName: true, email: true } },
      items: { include: { product: { select: { slug: true } } } },
    },
  });
  if (!order) return;

  const customItems = order.items.filter((item) => {
    const params = item.customParams as Record<string, unknown> | null;
    return item.product.slug === CUSTOM_PRINT_SLUG && isCustomPrintParams(params);
  });
  if (customItems.length === 0) return;

  const itemsHtml = customItems
    .map((item) => {
      const p = item.customParams as Record<string, unknown>;
      const dims = p.dimensions as { x: number; y: number; z: number } | undefined;
      const layer = LAYER_HEIGHTS.find((l) => l.value === Number(p.layerHeight));
      return `
        <div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px;">
          <p style="margin:0 0 8px;font-weight:bold;">${String(p.fileName || "model.stl")} × ${item.quantity} adet</p>
          <p style="margin:0 0 8px;"><a href="${String(p.fileUrl)}">STL dosyasını indir</a></p>
          <table style="font-size:13px;color:#333;">
            <tr><td style="padding-right:12px;">Boyutlar</td><td><b>${dims ? `${dims.x} × ${dims.y} × ${dims.z} mm` : "-"}</b></td></tr>
            <tr><td style="padding-right:12px;">Malzeme</td><td><b>${String(p.materialName || p.materialId)}</b></td></tr>
            <tr><td style="padding-right:12px;">Renk</td><td><b>${String(p.colorName || p.colorId)}</b></td></tr>
            <tr><td style="padding-right:12px;">Baskı kalitesi</td><td><b>${Number(p.layerHeight)}mm${layer ? ` (${layer.label})` : ""}</b></td></tr>
            <tr><td style="padding-right:12px;">Doluluk</td><td><b>%${Number(p.infillPercent)}</b></td></tr>
            <tr><td style="padding-right:12px;">Birim fiyat</td><td><b>${Number(item.unitPrice).toFixed(2)} TL</b></td></tr>
          </table>
        </div>`;
    })
    .join("");

  await sendEmail({
    to: CUSTOM_ORDER_NOTIFY_EMAIL,
    subject: `Özel baskı siparişi — ${order.orderNumber}`,
    html: `
      <h2>Özel 3D Baskı Siparişi</h2>
      <p>Sipariş No: <b>${order.orderNumber}</b></p>
      <p>Müşteri: <b>${order.user?.fullName || "-"}</b> (${order.user?.email || "-"})</p>
      ${itemsHtml}
      <p style="color:#666;font-size:12px;">Bu e-posta, ödemesi tamamlanan siparişteki müşteri yüklemesi modeller için otomatik gönderildi.</p>
    `,
  });
}

// ==========================================
// POST /api/payments/callback
// iyzico Checkout Form callback endpoint.
//
// iyzico ödeme sonrası kullanıcının tarayıcısını
// bu URL'e POST ile yönlendirir (form-urlencoded).
// Token ile ödeme sonucunu sorgular ve günceller.
// ==========================================

export async function POST(request: NextRequest) {
  const baseUrl = getAbsoluteUrl();

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

        // Müşteri yüklemesi modeller varsa üretim e-postasına bildir
        try {
          await notifyCustomPrintItems(payment.orderId);
        } catch (emailErr) {
          console.error("Özel baskı e-postası gönderilemedi:", emailErr);
        }

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
