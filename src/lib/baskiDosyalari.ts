// ==========================================
// HAZIR ÜRÜNLERİN BASKI DOSYALARI
//
// Kendin Üret ürünlerinin modeli siparişte, müşterinin
// ayarlarından kurulur. Hazır ürünlerin (abajur, vazo…) ise tek
// bir modeli var: atölye STL/3MF dosyalarını ürüne bir kez
// yükler, sipariş geldiğinde panelden indirip basar.
//
// Dosyalar müşteriye gösterilmez; ürün sayfası yalnızca
// görselleri ve renderları gösterir.
//
// Product.printFiles: [{ ad, url, boyut }]
// ==========================================

export interface BaskiDosyasi {
  /** Özgün dosya adı: "Govde_K36.stl" */
  ad: string;
  url: string;
  /** Bayt */
  boyut: number;
}

/** Atölyenin bastığı biçimler */
export const BASKI_UZANTILARI = [".stl", ".3mf", ".obj", ".step", ".stp", ".gcode", ".bgcode", ".zip"];

/** Bir dosyanın üst sınırı. Cloudinary planı daha düşük olabilir (ücretsiz: 10 MB). */
export const BASKI_DOSYASI_SINIR = 100 * 1024 * 1024;

export function baskiDosyasiMi(ad: string): boolean {
  const kucuk = ad.toLowerCase();
  return BASKI_UZANTILARI.some((u) => kucuk.endsWith(u));
}

/** Veritabanındaki JSON'u doğrular; bozuk kayıtları atar */
export function baskiDosyalariniOku(deger: unknown): BaskiDosyasi[] {
  if (!Array.isArray(deger)) return [];
  return deger.flatMap((d) => {
    if (!d || typeof d !== "object") return [];
    const { ad, url, boyut } = d as Record<string, unknown>;
    if (typeof ad !== "string" || typeof url !== "string" || !ad || !url) return [];
    return [{ ad, url, boyut: typeof boyut === "number" && boyut >= 0 ? boyut : 0 }];
  });
}

/** 2483712 → "2,4 MB" */
export function boyutYaz(bayt: number): string {
  if (!bayt) return "";
  if (bayt < 1024 * 1024) return `${Math.max(1, Math.round(bayt / 1024))} KB`;
  return `${(bayt / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}
