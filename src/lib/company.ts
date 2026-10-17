// ==========================================
// SATICI BİLGİLERİ — TEK KAYNAK
//
// İletişim sayfası, Ön Bilgilendirme Formu ve Mesafeli Satış
// Sözleşmesi aynı bilgiyi gösterir. Daha önce üçü ayrı ayrı
// yazılmıştı ve birbirini tutmuyordu: biri adjy3d.com, biri
// adjy.com diyordu, telefon ise gerçek bir numara değildi.
//
// Buradaki kural şu: elde olmayan bilgi uydurulmaz, hiç
// gösterilmez. null bırakılan alan sayfalarda da görünmez —
// böylece hiçbir yerde yanlış bir satıcı bilgisi yayımlanmaz.
// Eksik olan doldurulduğunda üç sayfa birden düzelir.
// ==========================================

export interface CompanyInfo {
  /** Markanın görünen adı */
  brand: string;
  /** Resmî ticaret unvanı — faturada ve sözleşmede geçen ad */
  legalName: string | null;
  address: {
    line1: string;
    line2: string;
    district: string;
    city: string;
    postalCode: string;
  } | null;
  phone: string | null;
  email: string | null;
  supportEmail: string | null;
  website: string;
  taxOffice: string | null;
  taxNumber: string | null;
  mersisNumber: string | null;
  /** Çalışma saatleri — iletişim sayfasında telefonun altında */
  workingHours: string | null;
  /** Google İşletme profili bağlantısı; yoksa adresten üretilir */
  mapsUrl: string | null;
}

export const COMPANY: CompanyInfo = {
  brand: "ADJY",

  // TODO(sahibi doldurmalı): resmî unvan verilmedi.
  // Şahıs şirketiyse ad-soyad, limitedse tam unvan yazılmalı.
  legalName: null,

  address: {
    line1: "Cihannüma Mahallesi, Salihefendi Sokak",
    line2: "Bıyıkoğlu İşhanı No: 19, Kat 5 Daire 3",
    district: "Beşiktaş",
    city: "İstanbul",
    postalCode: "34351",
  },

  phone: "+90 552 788 47 57",

  // Sahibinin bildirdiği adres. Site alan adıyla aynı değil
  // (adjyshopping.com), ama okunan kutu bu.
  email: "ahbe@adjy.com.tr",
  supportEmail: "ahbe@adjy.com.tr",

  website: "adjyshopping.com",

  /**
   * Google Haritalar bağlantısı.
   *
   * mapsUrl doldurulmazsa adresten bir arama bağlantısı
   * üretilir — her zaman çalışır ama işletme kaydına değil,
   * noktaya gider. Google İşletme profilinin bağlantısı
   * buraya yazılınca yorumlar ve fotoğraflarla birlikte açılır.
   */
  mapsUrl: null,

  taxOffice: null,
  taxNumber: null,
  mersisNumber: null,

  workingHours: "Pazartesi – Cuma, 09:00 – 18:00",
};

/** Adresi tek satırda yazar */
export function formatAddress(a: NonNullable<CompanyInfo["address"]>): string {
  return `${a.line1}, ${a.line2}, ${a.postalCode} ${a.district}/${a.city}`;
}

/** Sözleşmelerde kullanılan satıcı adı: unvan varsa o, yoksa marka */
export function sellerName(): string {
  return COMPANY.legalName ?? COMPANY.brand;
}

/**
 * Haritaya giden bağlantı. İşletme profili bağlantısı varsa o,
 * yoksa adresten üretilen arama bağlantısı.
 */
export function mapsLink(): string | null {
  if (COMPANY.mapsUrl) return COMPANY.mapsUrl;
  if (!COMPANY.address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    formatAddress(COMPANY.address)
  )}`;
}

/** Gömülü harita adresi — kullanıcı istediğinde yüklenir */
export function mapsEmbedUrl(): string | null {
  if (!COMPANY.address) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(
    formatAddress(COMPANY.address)
  )}&z=16&output=embed`;
}
