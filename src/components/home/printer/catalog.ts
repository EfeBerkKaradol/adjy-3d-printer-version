// ==========================================
// YAZICININ BASTIĞI ÜRÜNLER
//
// Her piksel nesne kataloğumuzdaki gerçek bir ürüne bağlı. Ana
// sayfa bu slug'ları veritabanında arar: ürün yayındaysa adı ve
// fiyatı oradan gelir, bağlantı ürün sayfasına gider. Ürün yoksa
// (kaldırılmış, adı değişmiş) bağlantı kategorisine düşer; boş
// bir sayfaya gönderilen ziyaretçi olmaz.
// ==========================================

export interface PrintableDef {
  /** sprites.ts içindeki anahtar */
  key: string;
  slug: string;
  /** Veritabanına ulaşılamazsa gösterilecek ad */
  fallbackName: string;
  /** Ürün bulunamazsa gidilecek kategori */
  categorySlug: string;
}

export const PRINTABLES: PrintableDef[] = [
  { key: "vazo", slug: "comlek-dokulu-vazo", fallbackName: "Çömlek Dokulu Vazo", categorySlug: "vazo-saksi-vazolar" },
  { key: "mantar", slug: "mantar-masa-lambasi", fallbackName: "Mantar Masa Lambası", categorySlug: "aydinlatma-masa-gece" },
  { key: "kedi", slug: "minimal-kedi-biblo-seti", fallbackName: "Minimal Kedi Biblo Seti", categorySlug: "dekorasyon-biblo-heykel" },
  { key: "saksi", slug: "ayakli-saksi", fallbackName: "Ayaklı Saksı", categorySlug: "vazo-saksi-saksilar" },
  { key: "ay", slug: "ay-gece-lambasi", fallbackName: "Ay Gece Lambası", categorySlug: "aydinlatma-masa-gece" },
  { key: "agac", slug: "isikli-masaustu-yilbasi-agaci", fallbackName: "Işıklı Masaüstü Yılbaşı Ağacı", categorySlug: "aydinlatma-masa-gece" },
];

/** Karşılamaya giden, istemciye hazır hâli */
export interface PrintItem {
  key: string;
  name: string;
  href: string;
  /** Biçimlenmiş fiyat; ürün bulunamadıysa yok */
  price: string | null;
}
