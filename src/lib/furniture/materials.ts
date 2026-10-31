// ==========================================
// MOBİLYA MALZEMELERİ VE PİYASA FİYATLARI
//
// Buradaki m² fiyatları Kasım 2026 piyasa araştırmasına
// dayanıyor: 18 mm beyaz suntalam levha bayilerde 2.000–2.700 TL
// bandında, plaka 5,88–6,70 m² olduğu için yaklaşık
// 340–400 TL/m². Biz küçük partiler alıp fire veriyoruz,
// o yüzden düz renklerde 450 TL/m² ile çalışıyoruz.
//
// Ahşap desenli dekorlar düz renklerden pahalı; masif kauçuk
// ve meşe ise bambaşka bir sınıf — levha değil, lamine masif
// panel alınıyor.
//
// TEK DOĞRU YER: fiyat değişince burası güncellenir, bütün
// ürünlerin fiyatı kendiliğinden yeni fiyata oturur. Hiçbir
// ürün dosyasında elle yazılmış fiyat yok.
// ==========================================

export interface Malzeme {
  id: string;
  ad: string;
  /** Müşteriye görünen kısa tanım */
  aciklama: string;
  tur: "suntalam" | "masif";
  /** Ekranda ve 3D'de kullanılan temel renk */
  hex: string;
  /** Damar çizilsin mi — düz renklerde çizilmez */
  damar: boolean;
  /** Damar çizgilerinin rengi */
  damarHex?: string;
  /** 18 mm gövde paneli, TL/m² */
  m2Fiyat18: number;
  /** 8 mm arka panel, TL/m² */
  m2Fiyat8: number;
  /** Kenar bandı, TL/m (masifte masif çıta) */
  bantMetreFiyat: number;
  /** Fiyat sıralamasında ve rozetlerde kullanılır */
  premium: boolean;
}

export const MALZEMELER: Malzeme[] = [
  {
    id: "kirik-beyaz",
    ad: "Kırık Beyaz",
    aciklama: "Mat düz dekor",
    tur: "suntalam",
    hex: "#ece7dd",
    damar: false,
    m2Fiyat18: 450,
    m2Fiyat8: 240,
    bantMetreFiyat: 18,
    premium: false,
  },
  {
    id: "beyaz",
    ad: "Beyaz",
    aciklama: "Mat düz dekor",
    tur: "suntalam",
    hex: "#f7f7f5",
    damar: false,
    m2Fiyat18: 450,
    m2Fiyat8: 240,
    bantMetreFiyat: 18,
    premium: false,
  },
  {
    id: "bej",
    ad: "Bej",
    aciklama: "Mat düz dekor",
    tur: "suntalam",
    hex: "#d9cdb8",
    damar: false,
    m2Fiyat18: 450,
    m2Fiyat8: 240,
    bantMetreFiyat: 18,
    premium: false,
  },
  {
    id: "keten",
    ad: "Keten",
    aciklama: "Dokulu açık gri",
    tur: "suntalam",
    hex: "#cfc9bf",
    damar: true,
    damarHex: "#bdb6aa",
    m2Fiyat18: 480,
    m2Fiyat8: 255,
    bantMetreFiyat: 18,
    premium: false,
  },
  {
    id: "antrasit",
    ad: "Antrasit",
    aciklama: "Mat koyu gri",
    tur: "suntalam",
    hex: "#3f4347",
    damar: false,
    m2Fiyat18: 490,
    m2Fiyat8: 260,
    bantMetreFiyat: 20,
    premium: false,
  },
  {
    id: "acik-mese",
    ad: "Açık Meşe",
    aciklama: "Ahşap desenli dekor",
    tur: "suntalam",
    hex: "#c49a68",
    damar: true,
    damarHex: "#a67c4b",
    m2Fiyat18: 520,
    m2Fiyat8: 280,
    bantMetreFiyat: 22,
    premium: false,
  },
  {
    id: "koyu-mese",
    ad: "Koyu Meşe",
    aciklama: "Ahşap desenli dekor",
    tur: "suntalam",
    hex: "#7a5733",
    damar: true,
    damarHex: "#5d4226",
    m2Fiyat18: 520,
    m2Fiyat8: 280,
    bantMetreFiyat: 22,
    premium: false,
  },
  {
    id: "ceviz",
    ad: "Ceviz",
    aciklama: "Ahşap desenli dekor",
    tur: "suntalam",
    hex: "#5c4532",
    damar: true,
    damarHex: "#443225",
    m2Fiyat18: 520,
    m2Fiyat8: 280,
    bantMetreFiyat: 22,
    premium: false,
  },
  {
    id: "kaucuk-masif",
    ad: "Kauçuk Masif",
    aciklama: "Lamine masif ahşap, doğal verniklenir",
    tur: "masif",
    hex: "#d7b183",
    damar: true,
    damarHex: "#b98f5e",
    m2Fiyat18: 1450,
    m2Fiyat8: 320,
    bantMetreFiyat: 46,
    premium: true,
  },
  {
    id: "mese-masif",
    ad: "Meşe Masif",
    aciklama: "Lamine masif meşe, doğal verniklenir",
    tur: "masif",
    hex: "#c08f51",
    damar: true,
    damarHex: "#9c6d36",
    m2Fiyat18: 2400,
    m2Fiyat8: 320,
    bantMetreFiyat: 64,
    premium: true,
  },
];

export function malzemeBul(id: string): Malzeme {
  return MALZEMELER.find((m) => m.id === id) ?? MALZEMELER[0];
}

/** Panel kalınlığı — gövde ve ön yüzeyler 18 mm, arka panel 8 mm */
export const GOVDE_KALINLIK = 18;
export const ARKA_KALINLIK = 8;
/** Çekmece kutusu 12 mm — gövde kalınlığında kutu gereksiz ağır ve pahalı olur */
export const KUTU_KALINLIK = 12;

/**
 * Kalınlığa göre metrekare fiyatı. 12 mm levha 18 mm'nin
 * yaklaşık dörtte üçü fiyatına geliyor; her malzemeye ayrı
 * bir alan yazmak yerine oranla çözülüyor.
 */
export function m2Fiyat(malzeme: Malzeme, kalinlik: number): number {
  if (kalinlik >= 18) return malzeme.m2Fiyat18;
  if (kalinlik >= 12) return malzeme.m2Fiyat18 * 0.75;
  return malzeme.m2Fiyat8;
}
