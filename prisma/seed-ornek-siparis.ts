// ==========================================
// ÖRNEK TASARIM SİPARİŞLERİ
//
// Her özelleştirilebilir ürün için bir örnek sipariş açar;
// hazır ürünlerden de birkaçına (ADJ-ORNEK-H1…): onlarda sipariş
// ekranı ürüne yüklenmiş baskı dosyalarını gösterir.
// Atölye, üretim ekranını gerçek bir sipariş üzerinde
// deneyebilsin: aracın müşteri kaydından modeli yeniden
// kurması, seçimlerin karşılaştırılması, STL ve imalat
// dosyalarının indirilmesi.
//
// Kayıtlar uydurma değil: scripts/ornek-tasarim-paketleri.py
// her aracı tarayıcıda açıp ADJY.paket() ile müşterinin
// sepete ekleyeceği kaydı alır (prisma/ornek-tasarim-paketleri.json).
// Fiyat da sipariş akışındaki gibi bu ölçümden hesaplanır.
//
// Siparişler "ADJ-ORNEK-<ARAÇ>" numarasıyla ve "Örnek Müşteri"
// adına açılır; notlarında örnek oldukları yazar. Tekrar
// çalıştırmak güvenli: var olan örnek sipariş güncellenir.
//
// Önce tasarım ürünleri:  npm run db:seed:tasarim
// Sonra:                  npm run db:seed:ornek-siparis
// ==========================================

import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { TASARIM_ARACLARI, type TasarimAraci } from "../src/lib/tasarim/catalog";
import { productionCost, sellingPrice } from "../src/lib/production";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface Paket {
  durum: Record<string, unknown>;
  ozet: { ad: string; deger: string; ayrinti?: boolean }[];
  olcum: { kutleG: number; sureSaat: number };
}

const MUSTERI = {
  email: "ornek.musteri@adjy.com",
  fullName: "Örnek Müşteri",
  phone: "+905550000000",
};
const NOT = "Örnek sipariş: atölye üretim ekranını denemek için oluşturuldu, üretime gönderilmez.";
const ADRES = {
  shippingLine1: "Atölye Sk. No: 1",
  shippingCity: "İstanbul",
  shippingState: "Kadıköy",
  shippingZip: "34710",
  billingLine1: "Atölye Sk. No: 1",
  billingCity: "İstanbul",
  billingState: "Kadıköy",
  billingZip: "34710",
};
/** Hazır ürünlerden kaç tanesine örnek sipariş açılır */
const HAZIR_ORNEK = 3;

// src/lib/tasarim/pricing.ts ile aynı hesap. O dosya "@/" takma
// adıyla içe aktarım yaptığı için betikten doğrudan çağrılamıyor.
function oturt(v: number, [min, max]: [number, number], yedek: number): number {
  return Number.isFinite(v) && v > 0 ? Math.min(max, Math.max(min, v)) : yedek;
}
function fiyat(arac: TasarimAraci, olcum: Paket["olcum"]) {
  const kutleG = oturt(olcum.kutleG, arac.sinir.kutleG, arac.varsayilan.kutleG);
  const sureSaat = oturt(olcum.sureSaat, arac.sinir.sureSaat, arac.varsayilan.sureSaat);
  const maliyet = productionCost({
    route: "fdm",
    weightGrams: kutleG,
    printMinutes: sureSaat * 60,
    largestMm: arac.enUzunMm,
  });
  const brut = sellingPrice(maliyet.unitCost + (arac.ekMaliyet ?? 0)).unitPriceGross;
  return { birim: Math.max(arac.tabanFiyat, Math.ceil(brut / 5) * 5), olcum: { kutleG, sureSaat } };
}

function secimler(ozet: Paket["ozet"]) {
  return (ozet ?? [])
    .filter((s) => s && s.ad && s.deger)
    .slice(0, 120)
    .map((s) => ({ ad: String(s.ad).slice(0, 80), deger: String(s.deger).slice(0, 240) }));
}

async function main() {
  const paketler = JSON.parse(
    readFileSync(new URL("./ornek-tasarim-paketleri.json", import.meta.url), "utf-8")
  ) as Record<string, Paket>;

  const musteri = await prisma.user.upsert({
    where: { email: MUSTERI.email },
    update: { fullName: MUSTERI.fullName, phone: MUSTERI.phone },
    create: { ...MUSTERI, role: "USER" },
  });

  for (const [i, arac] of TASARIM_ARACLARI.entries()) {
    const paket = paketler[arac.id];
    if (!paket) {
      console.log(`  – ${arac.ad}: kayıt yok, atlandı`);
      continue;
    }
    const urun = await prisma.product.findUnique({
      where: { sku: `TSR-${arac.id.toUpperCase()}` },
      select: { id: true },
    });
    if (!urun) {
      console.log(`  – ${arac.ad}: ürün satırı yok (önce db:seed:tasarim)`);
      continue;
    }

    const { birim, olcum } = fiyat(arac, paket.olcum);
    const tum = secimler(paket.ozet);
    const temel = secimler(paket.ozet.filter((s) => !s.ayrinti));
    const kargo = birim >= 1500 ? 0 : 89.9;
    const orderNumber = `ADJ-ORNEK-${arac.id.toUpperCase()}`;
    // Siparişler sırayla, birer gün arayla verilmiş gibi dursun
    const tarih = new Date(Date.now() - (TASARIM_ARACLARI.length - i) * 86_400_000);

    const kalem = {
      productId: urun.id,
      productName: arac.ad,
      productSku: `TSR-${arac.id.toUpperCase()}`,
      quantity: 1,
      unitPrice: birim,
      lineTotal: birim,
      customParams: {
        tasarimAraci: arac.id,
        ozet: temel.slice(0, 4).map((s) => `${s.ad}: ${s.deger}`).join(" · ") || "Varsayılan yapılandırma",
        secimler: tum,
        olcum,
        durum: paket.durum as Prisma.InputJsonObject,
      },
    };
    const siparis = {
      userId: musteri.id,
      status: "PROCESSING" as const,
      paymentStatus: "PAID" as const,
      totalAmount: birim,
      shippingCost: kargo,
      grandTotal: birim + kargo,
      shippingMethod: "Standart kargo",
      notes: NOT,
    };

    const var_ = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
    if (var_) {
      await prisma.orderItem.deleteMany({ where: { orderId: var_.id } });
      await prisma.order.update({
        where: { id: var_.id },
        data: { ...siparis, items: { create: [kalem] } },
      });
    } else {
      await prisma.order.create({
        data: {
          ...siparis,
          orderNumber,
          createdAt: tarih,
          items: { create: [kalem] },
          address: { create: ADRES },
          history: {
            create: [{ status: "PROCESSING", changedBy: "system", notes: NOT }],
          },
        },
      });
    }
    console.log(`  ✓ ${orderNumber} — ${arac.ad} — ${birim} TL (${olcum.kutleG} g, ${olcum.sureSaat} sa)`);
  }

  // ---------- Hazır ürünler ----------
  // Ayar yok: ürün olduğu gibi basılır. Sipariş ekranı ürüne
  // yüklenmiş baskı dosyalarını (Product.printFiles) gösterir.
  const hazirlar = await prisma.product.findMany({
    where: { isActive: true, NOT: { slug: { startsWith: "tasarla-" } } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: HAZIR_ORNEK,
    select: { id: true, name: true, sku: true, slug: true, basePrice: true },
  });
  for (const [i, urun] of hazirlar.entries()) {
    const birim = Number(urun.basePrice);
    const kargo = birim >= 1500 ? 0 : 89.9;
    const orderNumber = `ADJ-ORNEK-H${i + 1}`;
    const kalem = {
      productId: urun.id,
      productName: urun.name,
      productSku: urun.sku,
      quantity: 1,
      unitPrice: birim,
      lineTotal: birim,
    };
    const siparis = {
      userId: musteri.id,
      status: "PROCESSING" as const,
      paymentStatus: "PAID" as const,
      totalAmount: birim,
      shippingCost: kargo,
      grandTotal: birim + kargo,
      shippingMethod: "Standart kargo",
      notes: NOT,
    };
    const var_ = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
    if (var_) {
      await prisma.orderItem.deleteMany({ where: { orderId: var_.id } });
      await prisma.order.update({ where: { id: var_.id }, data: { ...siparis, items: { create: [kalem] } } });
    } else {
      await prisma.order.create({
        data: {
          ...siparis,
          orderNumber,
          createdAt: new Date(Date.now() - (hazirlar.length - i) * 3_600_000),
          items: { create: [kalem] },
          address: { create: ADRES },
          history: { create: [{ status: "PROCESSING", changedBy: "system", notes: NOT }] },
        },
      });
    }
    console.log(`  ✓ ${orderNumber} — ${urun.name} (hazır ürün) — ${birim} TL`);
  }
  console.log("\nÖrnek siparişler hazır.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
