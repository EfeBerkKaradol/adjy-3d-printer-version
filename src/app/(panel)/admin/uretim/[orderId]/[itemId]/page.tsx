import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { aracBul } from "@/lib/tasarim/catalog";
import {
  secimleriTemizle,
  skudanArac,
  tasarimDosyalari,
} from "@/lib/tasarim/order";
import { UretimEkrani } from "@/components/tasarim/UretimEkrani";

// ==========================================
// ÜRETİM EKRANI
//
// Tasarım aracıyla kurulmuş bir sipariş kaleminin atölye
// yüzü. Araç burada üretici kipinde, müşterinin kaydıyla
// açılır: müşterinin gördüğü model birebir yeniden oluşur,
// STL ve imalat dosyaları buradan indirilir.
//
// Yetki iki katmanda: /admin altındaki her istek middleware'den
// geçer, bu yerleşim de rolü veritabanından doğrular. Aracın
// üretici kipini sunan adres de (/admin/uretim-araci) aynı
// middleware'in arkasında.
// ==========================================

export const metadata: Metadata = { title: "Üretim Ekranı — ADJY" };
export const dynamic = "force-dynamic";

export default async function UretimPage({
  params,
}: {
  params: Promise<{ orderId: string; itemId: string }>;
}) {
  const { orderId, itemId } = await params;

  const kalem = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId },
    include: {
      product: { select: { sku: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          notes: true,
          createdAt: true,
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
    },
  });
  if (!kalem) notFound();

  const p = kalem.customParams as Record<string, unknown> | null;
  // Araç önce kayıttan okunur; kayıt yoksa (eski ya da karttan
  // eklenmiş sipariş) ürünün SKU'sundan bulunur.
  const arac =
    aracBul(typeof p?.tasarimAraci === "string" ? p.tasarimAraci : null) ??
    skudanArac(kalem.product.sku);
  if (!arac) notFound();

  const durum =
    p && typeof p.durum === "object" && p.durum !== null
      ? (p.durum as Record<string, unknown>)
      : null;
  const hamOlcum =
    p && typeof p.olcum === "object" && p.olcum !== null
      ? (p.olcum as Record<string, unknown>)
      : null;

  return (
    <UretimEkrani
      arac={arac}
      siparis={{
        id: kalem.order.id,
        no: kalem.order.orderNumber,
        durum: kalem.order.status,
        odeme: kalem.order.paymentStatus,
        not: kalem.order.notes,
        tarih: kalem.order.createdAt.toISOString(),
        musteri: kalem.order.user.fullName || kalem.order.user.email,
        eposta: kalem.order.user.email,
        telefon: kalem.order.user.phone,
      }}
      kalem={{
        id: kalem.id,
        urunAdi: kalem.productName,
        adet: kalem.quantity,
        birimFiyat: Number(kalem.unitPrice),
        secimler: secimleriTemizle(p?.secimler),
        dosyalar: tasarimDosyalari(durum),
        durum,
        olcum: {
          kutleG: Number(hamOlcum?.kutleG) || null,
          sureSaat: Number(hamOlcum?.sureSaat) || null,
        },
      }}
    />
  );
}
