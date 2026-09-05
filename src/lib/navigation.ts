// ==========================================
// ADJY ANA NAVİGASYON
// Üç eylem etrafında kurulu: SATIN AL · ÖZELLEŞTİR · ÜRET.
// Header, mobil çekmece ve footer aynı kaynaktan beslenir.
// ==========================================

export interface NavLink {
  label: string;
  href: string;
  description: string;
}

export const MAIN_NAV: NavLink[] = [
  {
    label: "Mağaza",
    href: "/products",
    description: "Üretime hazır ADJY nesneleri",
  },
  {
    label: "Yapılandır",
    href: "/configure",
    description: "Nesneyi kendi ölçünde ürettir",
  },
  {
    label: "Koleksiyonlar",
    href: "/collections",
    description: "Kategorilere göre keşfet",
  },
];

/**
 * İkincil bağlantılar — ana navigasyonu kalabalıklaştırmazlar,
 * mobil menünün altında ve footer'da yer alırlar.
 */
export const SECONDARY_NAV: NavLink[] = [
  {
    label: "Kendi modelini üret",
    href: "/3d-baski-fiyati-hesapla",
    description: "STL yükle, teklif al",
  },
  { label: "Hakkımızda", href: "/about", description: "" },
  { label: "SSS", href: "/faq", description: "" },
  { label: "İletişim", href: "/contact", description: "" },
];

export const FOOTER_NAV: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Alışveriş",
    links: [
      { label: "Mağaza", href: "/products" },
      { label: "Koleksiyonlar", href: "/collections" },
      { label: "Yapılandır", href: "/configure" },
      { label: "Kendi modelini üret", href: "/3d-baski-fiyati-hesapla" },
      { label: "Öne Çıkanlar", href: "/products?featured=true" },
    ],
  },
  {
    title: "ADJY",
    links: [
      { label: "Hakkımızda", href: "/about" },
      { label: "İletişim", href: "/contact" },
      { label: "SSS", href: "/faq" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "Teslimat", href: "/teslimat-politikasi" },
      { label: "İade ve İptal", href: "/iade-politikasi" },
      { label: "Ön Bilgilendirme", href: "/on-bilgilendirme" },
      { label: "Mesafeli Satış", href: "/mesafeli-satis-sozlesmesi" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { label: "KVKK", href: "/kvkk" },
      { label: "Gizlilik", href: "/privacy" },
      { label: "Çerez Politikası", href: "/cerez-politikasi" },
      { label: "Kullanım Şartları", href: "/terms" },
    ],
  },
];
