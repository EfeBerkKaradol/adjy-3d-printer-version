import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAbsoluteUrl } from "@/lib/url";
import { aracBul } from "./catalog";
import { uretimEkraniAdresi } from "./adresler";
import {
  secimleriTemizle,
  tasarimDosyalari,
  tasarimParametreleriMi,
} from "./order";

// ==========================================
// ATÖLYE BİLDİRİMİ — TASARIM ARAÇLARI
//
// Tasarım aracıyla kurulan bir ürünün ödemesi tamamlandığında
// atölyeye e-posta gider. İçinde iki şey var:
//
//   - müşterinin seçtiği her şey, düz metin olarak;
//   - siparişin üretim ekranına giden bağlantı. O ekran aracı
//     müşterinin kaydıyla açar ve STL'i oradan indirtir.
//
// STL e-postaya eklenmez, çünkü ortada bir dosya yok: model
// kayıttan, o an yeniden üretiliyor.
// ==========================================

const BILDIRIM_ADRESI =
  process.env.CUSTOM_ORDER_NOTIFY_EMAIL || "efeberkkaradol@gmail.com";

/** Seçimler müşterinin yazdığı metni içerir (başlık, bağlantı…) */
function kacis(metin: unknown): string {
  return String(metin ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function tasarimSiparisiniBildir(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { fullName: true, email: true } },
      items: true,
    },
  });
  if (!order) return;

  const kalemler = order.items.filter((k) =>
    tasarimParametreleriMi(k.customParams as Record<string, unknown> | null)
  );
  if (kalemler.length === 0) return;

  const kok = getAbsoluteUrl();

  const kalemlerHtml = kalemler
    .map((k) => {
      const p = k.customParams as Record<string, unknown>;
      const arac = aracBul(String(p.tasarimAraci));
      const secimler = secimleriTemizle(p.secimler);
      const dosyalar = tasarimDosyalari(p.durum);
      const satirlar = secimler
        .map(
          (s) =>
            `<tr><td style="padding:2px 14px 2px 0;color:#666;vertical-align:top;">${kacis(
              s.ad
            )}</td><td style="padding:2px 0;"><b>${kacis(s.deger)}</b></td></tr>`
        )
        .join("");
      const dosyaSatirlari = dosyalar
        .filter((d) => d.url)
        .map(
          (d) =>
            `<p style="margin:6px 0 0;">Müşteri dosyası: <a href="${kacis(d.url)}">${kacis(
              d.ad
            )}</a></p>`
        )
        .join("");
      return `
        <div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px;">
          <p style="margin:0 0 4px;font-weight:bold;">${kacis(
            arac?.ad ?? k.productName
          )} × ${k.quantity} adet</p>
          <p style="margin:0 0 12px;">
            <a href="${kok}${uretimEkraniAdresi(order.id, k.id)}">Üretim ekranını aç — STL ve imalat dosyaları</a>
          </p>
          <table style="font-size:13px;color:#333;border-collapse:collapse;">${
            satirlar ||
            '<tr><td style="color:#666;">Varsayılan yapılandırma</td></tr>'
          }</table>
          ${dosyaSatirlari}
          <p style="margin:10px 0 0;font-size:13px;">Birim fiyat: <b>${Number(
            k.unitPrice
          ).toFixed(2)} TL</b></p>
        </div>`;
    })
    .join("");

  await sendEmail({
    to: BILDIRIM_ADRESI,
    subject: `Tasarım siparişi — ${order.orderNumber}`,
    html: `
      <h2>Kendin Tasarla Siparişi</h2>
      <p>Sipariş No: <b>${kacis(order.orderNumber)}</b></p>
      <p>Müşteri: <b>${kacis(order.user?.fullName || "-")}</b> (${kacis(
        order.user?.email || "-"
      )})</p>
      ${kalemlerHtml}
      <p style="color:#666;font-size:12px;">Üretim ekranı yönetici girişi ister. Araç müşterinin kurduğu modelle açılır; STL ve imalat anteti oradan indirilir.</p>
    `,
  });
}
