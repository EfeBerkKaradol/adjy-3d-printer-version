// ==========================================
// ADJY ANA NAVİGASYON
//
// "Yapılandır" ayrı bir bölümdü: ölçüsü değişen ürünleri
// listeleyip oradan ayarlamaya götürüyordu. Ölçü ayarı artık
// mağazadaki kartların altında olduğu için o adım gereksiz —
// insan ölçüyü ürünü gördüğü yerde değiştiriyor.
//
// Header, mobil çekmece ve footer aynı kaynaktan beslenir.
// ==========================================

export interface NavLink {
  label: string;
  href: string;
  description: string;
  /** Mobil menüde ana başlığın altında açılan alt yollar */
  children?: { label: string; href: string }[];
}

export const MAIN_NAV: NavLink[] = [
  {
    label: "Mağaza",
    href: "/products",
    description: "Üretime hazır ADJY nesneleri",
  },
  {
    // Üret artık tek bir hesaplayıcı değil, iki başlangıcı olan
    // bir bölüm: elinde model olan yükler, olmayan fotoğraftan
    // başlar. Eski hesaplayıcı adresi çalışmaya devam ediyor.
    label: "Üret",
    href: "/uret",
    description: "Modelini yükle ya da fotoğraftan oluştur",
    children: [
      { label: "Fotoğraftan Oluştur", href: "/uret/fotograftan-olustur" },
      { label: "Kendi Modelini Yükle", href: "/uret/model-yukle" },
    ],
  },
  {
    label: "Koleksiyonlar",
    href: "/collections",
    description: "Kategorilere göre keşfet",
  },
  {
    // Ana sayfadaki anlatı buraya taşındığından beri Hakkımızda
    // yalnızca bir kurumsal sayfa değil: nasıl ürettiğimizi,
    // ölçünün neden değiştiğini ve nesnelerin mekâna nasıl
    // oturduğunu burası anlatıyor. Altbilgiden bulunması zordu.
    label: "Hakkımızda",
    href: "/about",
    description: "Nasıl ürettiğimiz ve ölçünün neden değiştiği",
  },
];

/**
 * İkincil bağlantılar — ana navigasyonu kalabalıklaştırmazlar,
 * mobil menünün altında ve footer'da yer alırlar.
 */
export const SECONDARY_NAV: NavLink[] = [
  // Hakkımızda ana navigasyona alındı; burada da kalsaydı mobil
  // çekmecede iki kez görünürdü.
  { label: "SSS", href: "/faq", description: "" },
  { label: "İletişim", href: "/contact", description: "" },
];

export const FOOTER_NAV: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Alışveriş",
    links: [
      { label: "Mağaza", href: "/products" },
      { label: "Koleksiyonlar", href: "/collections" },
      { label: "Üret", href: "/uret" },
      { label: "Fotoğraftan oluştur", href: "/uret/fotograftan-olustur" },
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
