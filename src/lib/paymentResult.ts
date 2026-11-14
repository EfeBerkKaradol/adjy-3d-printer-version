// ==========================================
// ÖDEME SONUCUNU SİPARİŞE İŞLEME
//
// Checkout Form callback'i (/api/payments/callback) ve piksel
// kart formunun 3D Secure callback'i (/api/payments/3ds/callback)
// aynı kayıtları günceller; ikisi aynı yazılsın diye burada.
// rawResponse'a yalnızca iyzico yanıtı yazılır; o yanıtta kart
// numarasının sadece ilk 6-8 hanesi (BIN) ve son 4 hanesi bulunur.
// ==========================================

import { prisma } from "@/lib/db";
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
export async function notifyCustomPrintItems(orderId: string) {
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

export interface PaidResult {
  paymentId?: string | number;
  lastFourDigits?: string;
  cardType?: string;
  cardAssociation?: string;
  installment?: number;
}

/** Ödemeyi ve siparişi "ödendi" yapar, özel baskı e-postasını gönderir */
export async function markPaymentPaid(
  payment: { id: string; orderId: string },
  result: PaidResult,
  raw: unknown
) {
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
        rawResponse: JSON.parse(JSON.stringify(raw)),
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
}

/** Ödemeyi ve siparişi "başarısız" yapar */
export async function markPaymentFailed(
  payment: { id: string; orderId: string },
  errorCode: string | null | undefined,
  errorMessage: string | null | undefined,
  raw: unknown
) {
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        errorCode: errorCode || null,
        errorMessage: errorMessage || null,
        rawResponse: JSON.parse(JSON.stringify(raw)),
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
        notes: errorMessage || "Ödeme başarısız",
      },
    });
  });
}
