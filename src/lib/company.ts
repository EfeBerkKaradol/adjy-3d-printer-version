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

  // TODO(sahibi doldurmalı): gerçek numara verilmedi.
  // Önceki "+90 (212) 555 0123" kurgusal bir numaraydı, kaldırıldı.
  phone: null,

  // TODO(sahibi doldurmalı): hangi alan adının kullanılacağı netleşmedi
  // (adjy3d.com ile adjyshopping.com karışık kullanılıyordu).
  email: null,
  supportEmail: null,

  website: "adjyshopping.com",

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
