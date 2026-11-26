// ==========================================
// TASARIM ARAÇLARI — FİYAT
//
// Araçlar modelin kendisini tarayıcıda kuruyor ve kurarken
// ne kadar filament gideceğini, kaç saat basılacağını da
// hesaplıyor. Maliyet kalemleri mağazanın geri kalanıyla aynı
// kaynaktan (lib/production) geliyor.
//
// Fiyat iki parçadan oluşur:
//
//   piyasa → her ürünün varsayılan kurulumu için seçilmiş fiyat
//            (catalog.ts, piyasaFiyati): Türkiye'de benzer 3B baskı
//            ürünlerin ortalaması. Yalnızca maliyete marj eklemek
//            küçük parçalarda (hazırlık ücreti baskın) ve büyük
//            parçalarda piyasanın iki üç katı fiyat çıkarıyordu.
//   oran   → kurulum değişince fiyat, maliyetle aynı oranda değişir:
//            iki kat filament ve süre isteyen kurulum yaklaşık iki
//            kat tutar.
//
// Alt sınır maliyettir: fiyat hiçbir kurulumda maliyetin
// TABAN_KAT katının (KDV dâhil) altına inmez.
//
// Ölçüm tarayıcıdan geldiği için sunucu ona körü körüne
// güvenmez: her aracın üretebileceği en hafif ve en ağır
// parça bellidir, gelen sayı o aralığa oturtulur.
// ==========================================

// Göreli yol: örnek sipariş betiği (ornekSiparisler.ts) "@/" takma
// adını çözemiyor ve fiyatı buradan alıyor.
import { productionCost } from "../production";
import { aracBul, slugdanAracId, type TasarimAraci } from "./catalog";

export interface TasarimOlcumu {
  /** Basılacak toplam filament (g) */
  kutleG: number;
  /** Toplam baskı süresi (saat) */
  sureSaat: number;
}

/**
 * Maliyetin KDV dâhil en az kaç katına satılır. 1,5 = KDV'den sonra
 * kabaca %20 brüt kâr: büyük ve ağır kurulumlarda zarar edilmesin.
 */
export const TABAN_KAT = 1.5;

function oturt(v: unknown, min: number, max: number, yedek: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return yedek;
  return Math.min(max, Math.max(min, n));
}

/** Tarayıcıdan gelen ölçümü aracın üretim aralığına çeker */
export function olcumuDogrula(
  arac: TasarimAraci,
  ham: Partial<TasarimOlcumu> | null | undefined
): TasarimOlcumu {
  return {
    kutleG: oturt(
      ham?.kutleG,
      arac.sinir.kutleG[0],
      arac.sinir.kutleG[1],
      arac.varsayilan.kutleG
    ),
    sureSaat: oturt(
      ham?.sureSaat,
      arac.sinir.sureSaat[0],
      arac.sinir.sureSaat[1],
      arac.varsayilan.sureSaat
    ),
  };
}

/**
 * Perakende yuvarlaması: 100 ₺ üstü …9'a (349, 1.199), altı 5'in
 * katına yukarı. Varsayılan kurulumda piyasaFiyati olduğu gibi kalır.
 */
export function tasarimFiyatiniYuvarla(tutar: number): number {
  if (tutar < 100) return Math.ceil(tutar / 5) * 5;
  return Math.ceil((tutar + 1) / 10) * 10 - 1;
}

/** Filament + makine + hazırlık + fire + filament dışı parçalar (₺) */
export function tasarimMaliyeti(arac: TasarimAraci, olcum: TasarimOlcumu): number {
  const maliyet = productionCost({
    route: "fdm",
    weightGrams: olcum.kutleG,
    printMinutes: olcum.sureSaat * 60,
    largestMm: arac.enUzunMm,
  });
  return maliyet.unitCost + (arac.ekMaliyet ?? 0);
}

/** KDV dâhil birim fiyat */
export function tasarimFiyati(
  arac: TasarimAraci,
  ham: Partial<TasarimOlcumu> | null | undefined
): number {
  const olcum = olcumuDogrula(arac, ham);
  const maliyet = tasarimMaliyeti(arac, olcum);
  const varsayilanMaliyet = tasarimMaliyeti(arac, arac.varsayilan);
  const oranli = arac.piyasaFiyati * (maliyet / varsayilanMaliyet);
  return tasarimFiyatiniYuvarla(Math.max(oranli, maliyet * TABAN_KAT));
}

/** Kartlarda ve arama sonuçlarında gösterilen başlangıç fiyatı */
export function tasarimBaslangicFiyati(arac: TasarimAraci): number {
  return tasarimFiyati(arac, arac.varsayilan);
}

/**
 * Veritabanından okunan bir ürün satırının gösterilecek fiyatı ve adı.
 * Kendin Tasarla ürünlerinde (slug: tasarla-…) katalogdan gelir: satır
 * eşitlenmeden önce oluşmuş önbellekli bir sayfa (ana sayfa 5 dk)
 * eski fiyatı göstermesin. Diğer ürünlerde satır olduğu gibi.
 */
export function satirGosterimi(satir: { slug: string; name: string; basePrice: unknown }): {
  name: string;
  basePrice: number;
} {
  const arac = aracBul(slugdanAracId(satir.slug));
  if (!arac) return { name: satir.name, basePrice: Number(satir.basePrice) };
  return { name: arac.ad, basePrice: tasarimBaslangicFiyati(arac) };
}
