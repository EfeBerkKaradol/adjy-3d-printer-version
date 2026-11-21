// ==========================================
// ÖRNEK SİPARİŞLER
//
// Her özelleştirilebilir (Kendin Üret) ürün için bir örnek sipariş
// açar; hazır ürünlerden de birkaçına (ADJ-ORNEK-H1…). Atölye
// üretim ekranını gerçek bir sipariş üzerinde deneyebilsin: aracın
// müşteri kaydından modeli yeniden kurması, seçimlerin
// karşılaştırılması, STL ve imalat dosyalarının indirilmesi.
// Hazır ürünlerde sipariş ekranı ürünün baskı dosyalarını gösterir.
//
// Kayıtlar uydurma değil: scripts/ornek-tasarim-paketleri.py her
// aracı tarayıcıda açıp ADJY.paket() ile müşterinin sepete
// ekleyeceği kaydı alır (prisma/ornek-tasarim-paketleri.json).
// Fiyat da sipariş akışındaki gibi bu ölçümden hesaplanır.
//
// İki yerden çalışır:
//   - admin → Kendin Üret Atölyesi → "Örnek siparişleri oluştur"
//     (canlı veritabanı için; bkz. /api/admin/ornek-siparisler)
//   - npm run db:seed:ornek-siparis (yerel)
//
// Siparişler "Örnek Müşteri" adına, hazırlanıyor durumunda ve
// ödemesi BEKLEMEDE açılır: ciro ve rapor toplamları yalnızca
// ödenmiş siparişleri sayar, örnekler ciroya karışmaz. Süresi
// dolan ödeme temizliği yalnızca PENDING durumdakilere bakar,
// örnekler iptal edilmez. Tekrar çalıştırmak güvenli: var olan
// örnek sipariş güncellenir.
//
// Betikten de çağrıldığı için "@/" takma adı kullanılmaz.
// ==========================================

import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { TASARIM_ARACLARI, type TasarimAraci } from "./catalog";
import { productionCost, sellingPrice } from "../production";
import PAKETLER from "../../../prisma/ornek-tasarim-paketleri.json";

interface Paket {
  durum: Record<string, unknown>;
  ozet: { ad: string; deger: string; ayrinti?: boolean }[];
  olcum: { kutleG: number; sureSaat: number };
}

export const ORNEK_SIPARIS_ONEK = "ADJ-ORNEK-";

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
// adıyla içe aktarım yaptığı için betikten çağrılamıyor.
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

export interface OrnekSonucu {
  /** Kurulan ya da güncellenen siparişler */
  kurulan: { no: string; urun: string; tutar: number }[];
  /** Atlanan ürünler ve nedeni */
  atlanan: { urun: string; neden: string }[];
}

type Kalem = Prisma.OrderItemUncheckedCreateWithoutOrderInput;

export async function ornekSiparisleriKur(prisma: PrismaClient): Promise<OrnekSonucu> {
  const paketler = PAKETLER as unknown as Record<string, Paket>;
  const sonuc: OrnekSonucu = { kurulan: [], atlanan: [] };

  const musteri = await prisma.user.upsert({
    where: { email: MUSTERI.email },
    update: { fullName: MUSTERI.fullName, phone: MUSTERI.phone },
    create: { ...MUSTERI, role: "USER" },
  });

  /** Siparişi açar ya da (aynı numara varsa) kalemini ve tutarını yeniler */
  async function yaz(orderNumber: string, kalem: Kalem, tarih: Date) {
    const birim = Number(kalem.unitPrice);
    const kargo = birim >= 1500 ? 0 : 89.9;
    const siparis = {
      userId: musteri.id,
      status: "PROCESSING" as const,
      paymentStatus: "PENDING" as const,
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
          history: { create: [{ status: "PROCESSING", changedBy: "system", notes: NOT }] },
        },
      });
    }
    sonuc.kurulan.push({ no: orderNumber, urun: String(kalem.productName), tutar: birim });
  }

  // ---------- Kendin Üret ürünleri ----------
  const skular = TASARIM_ARACLARI.map((a) => `TSR-${a.id.toUpperCase()}`);
  const urunler = new Map(
    (
      await prisma.product.findMany({
        where: { sku: { in: skular } },
        select: { id: true, sku: true },
      })
    ).map((u) => [u.sku, u.id])
  );

  for (const [i, arac] of TASARIM_ARACLARI.entries()) {
    const paket = paketler[arac.id];
    const sku = `TSR-${arac.id.toUpperCase()}`;
    const productId = urunler.get(sku);
    if (!paket) {
      sonuc.atlanan.push({ urun: arac.ad, neden: "örnek kayıt yok" });
      continue;
    }
    if (!productId) {
      sonuc.atlanan.push({ urun: arac.ad, neden: `${sku} ürün satırı yok (db:seed:tasarim)` });
      continue;
    }
    const { birim, olcum } = fiyat(arac, paket.olcum);
    const tum = secimler(paket.ozet);
    const temel = secimler(paket.ozet.filter((s) => !s.ayrinti));
    await yaz(
      `${ORNEK_SIPARIS_ONEK}${arac.id.toUpperCase()}`,
      {
        productId,
        productName: arac.ad,
        productSku: sku,
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
      },
      // Siparişler sırayla, birer gün arayla verilmiş gibi dursun
      new Date(Date.now() - (TASARIM_ARACLARI.length - i) * 86_400_000)
    );
  }

  // ---------- Hazır ürünler ----------
  // Ayar yok: ürün olduğu gibi basılır. Sipariş ekranı ürüne
  // yüklenmiş baskı dosyalarını (Product.printFiles) gösterir.
  const hazirlar = await prisma.product.findMany({
    where: { isActive: true, NOT: { slug: { startsWith: "tasarla-" } } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: HAZIR_ORNEK,
    select: { id: true, name: true, sku: true, basePrice: true },
  });
  for (const [i, urun] of hazirlar.entries()) {
    const birim = Number(urun.basePrice);
    await yaz(
      `${ORNEK_SIPARIS_ONEK}H${i + 1}`,
      {
        productId: urun.id,
        productName: urun.name,
        productSku: urun.sku,
        quantity: 1,
        unitPrice: birim,
        lineTotal: birim,
      },
      new Date(Date.now() - (hazirlar.length - i) * 3_600_000)
    );
  }

  return sonuc;
}

// Örnek siparişler hiç yoksa admin sipariş listesi ya da atölye ilk
// açıldığında kendiliğinden kurulur: canlıda düğmeye basmayı ya da
// betik çalıştırmayı beklemesin. Bir örnek bile varsa dokunulmaz
// (yenilemek için atölyedeki düğme). Aynı süreçte bir kez denetlenir.
let denetlendi = false;
let suren: Promise<void> | null = null;

export async function ornekSiparisleriGerekirseKur(prisma: PrismaClient): Promise<void> {
  if (denetlendi) return;
  suren ??= (async () => {
    try {
      const sayi = await prisma.order.count({
        where: { orderNumber: { startsWith: ORNEK_SIPARIS_ONEK } },
      });
      if (sayi === 0) {
        const { kurulan, atlanan } = await ornekSiparisleriKur(prisma);
        console.log(`[ornek-siparis] ${kurulan.length} kuruldu, ${atlanan.length} atlandı`);
      }
      denetlendi = true;
    } catch (e) {
      // Liste yine açılsın; sonraki istekte yeniden denenir
      console.error("[ornek-siparis] kurulamadı", e);
    } finally {
      suren = null;
    }
  })();
  await suren;
}
