// ==========================================
// TASARIM ARAÇLARI — FİYAT
//
// Araçlar modelin kendisini tarayıcıda kuruyor ve kurarken
// ne kadar filament gideceğini, kaç saat basılacağını da
// hesaplıyor. Fiyat bu iki sayıdan çıkıyor; maliyet kalemleri
// mağazanın geri kalanıyla aynı kaynaktan (lib/production)
// geliyor ki aynı ağırlıktaki iki ürün iki ayrı fiyat
// yazmasın.
//
// Ölçüm tarayıcıdan geldiği için sunucu ona körü körüne
// güvenmez: her aracın üretebileceği en hafif ve en ağır
// parça bellidir, gelen sayı o aralığa oturtulur. Aralığın
// altına inen bir ölçüm fiyatı ancak en küçük ürünün fiyatına
// kadar düşürebilir — o da zaten satılan bir fiyattır.
// ==========================================

import { productionCost, sellingPrice } from "@/lib/production";
import type { TasarimAraci } from "./catalog";

export interface TasarimOlcumu {
  /** Basılacak toplam filament (g) */
  kutleG: number;
  /** Toplam baskı süresi (saat) */
  sureSaat: number;
}

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

/** Fiyatlar 5 liranın katına, yukarı yuvarlanır */
export function tasarimFiyatiniYuvarla(tutar: number): number {
  return Math.ceil(tutar / 5) * 5;
}

/**
 * KDV dâhil birim fiyat.
 *
 * Tabana düşmez: çok küçük bir parçada da dilimleme, tabla
 * hazırlığı ve paketleme aynı emeği istiyor.
 */
export function tasarimFiyati(
  arac: TasarimAraci,
  ham: Partial<TasarimOlcumu> | null | undefined
): number {
  const olcum = olcumuDogrula(arac, ham);
  const maliyet = productionCost({
    route: "fdm",
    weightGrams: olcum.kutleG,
    printMinutes: olcum.sureSaat * 60,
    largestMm: arac.enUzunMm,
  });
  const ekMaliyet = arac.ekMaliyet ?? 0;
  const fiyat = sellingPrice(maliyet.unitCost + ekMaliyet).unitPriceGross;
  return Math.max(arac.tabanFiyat, tasarimFiyatiniYuvarla(fiyat));
}

/** Kartlarda ve arama sonuçlarında gösterilen başlangıç fiyatı */
export function tasarimBaslangicFiyati(arac: TasarimAraci): number {
  return tasarimFiyati(arac, arac.varsayilan);
}
