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
  /** Masaüstü dock'ta üstüne gelince aşağı açılan menü */
  menu?: NavMenu;
}

export interface NavMenuLink {
  label: string;
  href: string;
  description?: string;
}

export interface NavMenuGroup {
  title: string;
  /** Başlık da bir bağlantı olabilir (ör. ana kategori) */
  href?: string;
  links: NavMenuLink[];
}

export interface NavMenu {
  /** Panelin genişliği (px) — içerik kadar, ekrana sığacak şekilde kırpılır */
  width: number;
  /** "shop": gruplar mağazanın canlı kategori ağacından doldurulur */
  kind?: "shop";
  groups: NavMenuGroup[];
  /** Panelin altındaki "tümünü gör" bağlantısı */
  footer?: NavMenuLink;
}

export const MAIN_NAV: NavLink[] = [
  {
    label: "Mağaza",
    href: "/products",
    description: "Üretime hazır ADJY nesneleri",
    menu: {
      width: 1020,
      kind: "shop",
      // Kategori sütunları /api/categories'den gelir; bu grup
      // her zaman sağda durur. Ağaç yüklenemezse yedek liste
      // (SHOP_FALLBACK) kullanılır.
      groups: [
        {
          title: "Keşfet",
          links: [
            { label: "Tüm Ürünler", href: "/products" },
            { label: "Öne Çıkanlar", href: "/products?featured=true" },
            { label: "Ölçüsü Ayarlanabilir", href: "/products?customizable=true" },
            { label: "Kendin Tasarla", href: "/tasarla" },
            { label: "Hediye Fikirleri", href: "/products?koleksiyon=koleksiyon-hediye" },
            { label: "Kişiye Özel", href: "/products?koleksiyon=koleksiyon-kisiye-ozel" },
            { label: "Yılbaşı", href: "/products?koleksiyon=koleksiyon-yilbasi" },
          ],
        },
      ],
      footer: { label: "Tüm ürünleri gör", href: "/products" },
    },
  },
  {
    // Üret artık tek bir hesaplayıcı değil, iki başlangıcı olan
    // bir bölüm: elinde model olan yükler, olmayan fotoğraftan
    // başlar. Eski hesaplayıcı adresi çalışmaya devam ediyor.
    label: "Üret",
    href: "/uret",
    description: "Modelini yükle ya da fotoğraftan oluştur",
    children: [
      { label: "Kendin Tasarla", href: "/tasarla" },
      { label: "Fotoğraftan Oluştur", href: "/uret/fotograftan-olustur" },
      { label: "Kendi Modelini Yükle", href: "/uret/model-yukle" },
    ],
    menu: {
      width: 360,
      groups: [
        {
          title: "Nereden başlıyorsun?",
          links: [
            {
              // Hazır tasarım araçları: müşteri model getirmez,
              // ürünü ölçüsü ve ayrıntısıyla burada kurar.
              label: "Kendin Tasarla",
              href: "/tasarla",
              description: "Saksı, avize, lamba, kutu — ölçüsünü sen kur",
            },
            {
              label: "Fotoğraftan Oluştur",
              href: "/uret/fotograftan-olustur",
              description: "Elinde model yoksa bir fotoğraf yeter",
            },
            {
              label: "Kendi Modelini Yükle",
              href: "/uret/model-yukle",
              description: "STL dosyanı yükle, basalım",
            },
            {
              label: "3D Baskı Fiyatı Hesapla",
              href: "/3d-baski-fiyati-hesapla",
              description: "Malzeme ve ölçüye göre anında fiyat",
            },
          ],
        },
      ],
      footer: { label: "Üret'e git", href: "/uret" },
    },
  },
  {
    // Mobilya mağazanın bir rafı değil, ayrı bir bölüm: ürün
    // sayfası yok, yapılandırıcı var. Koleksiyonların içine
    // gömülseydi kimse bulamazdı.
    label: "Mobilya",
    href: "/mobilya",
    description: "Ölçüsünü kendiniz kurduğunuz modüler mobilya",
    children: [
      { label: "Oturma Odası", href: "/mobilya/oturma-odasi" },
      { label: "Yemek Odası", href: "/mobilya/yemek-odasi" },
      { label: "Yatak Odası", href: "/mobilya/yatak-odasi" },
      { label: "Mutfak", href: "/mobilya/mutfak" },
      { label: "Ofis", href: "/mobilya/ofis" },
      { label: "Antre Mobilyası", href: "/mobilya/antre" },
      { label: "Genç Odası", href: "/mobilya/genc-odasi" },
      { label: "Banyo", href: "/mobilya/banyo" },
      { label: "Dekoratif Raf", href: "/mobilya/dekoratif-raf" },
      { label: "Basit Şekiller", href: "/mobilya/basit-sekiller" },
    ],
    menu: {
      width: 460,
      groups: [
        {
          title: "Odalar",
          links: [
            { label: "Oturma Odası", href: "/mobilya/oturma-odasi" },
            { label: "Yemek Odası", href: "/mobilya/yemek-odasi" },
            { label: "Yatak Odası", href: "/mobilya/yatak-odasi" },
            { label: "Mutfak", href: "/mobilya/mutfak" },
            { label: "Banyo", href: "/mobilya/banyo" },
          ],
        },
        {
          title: "Alanlar",
          links: [
            { label: "Ofis", href: "/mobilya/ofis" },
            { label: "Antre Mobilyası", href: "/mobilya/antre" },
            { label: "Genç Odası", href: "/mobilya/genc-odasi" },
            { label: "Dekoratif Raf", href: "/mobilya/dekoratif-raf" },
            { label: "Basit Şekiller", href: "/mobilya/basit-sekiller" },
          ],
        },
      ],
      footer: { label: "Tüm mobilyayı gör", href: "/mobilya" },
    },
  },
  {
    label: "Koleksiyonlar",
    href: "/collections",
    description: "Kategorilere göre keşfet",
    menu: {
      width: 340,
      groups: [
        {
          title: "Koleksiyonlar",
          links: [
            {
              label: "Hediye Fikirleri",
              href: "/products?koleksiyon=koleksiyon-hediye",
              description: "Sevdiklerine ölçüsüyle yapılmış bir şey",
            },
            {
              label: "Kişiye Özel",
              href: "/products?koleksiyon=koleksiyon-kisiye-ozel",
              description: "İsim, ölçü ve renk senden",
            },
            {
              label: "Yılbaşı",
              href: "/products?koleksiyon=koleksiyon-yilbasi",
              description: "Yeni yıla hazırlık",
            },
          ],
        },
      ],
      footer: { label: "Tüm koleksiyonlar", href: "/collections" },
    },
  },
  {
    // Ana sayfadaki anlatı buraya taşındığından beri Hakkımızda
    // yalnızca bir kurumsal sayfa değil: nasıl ürettiğimizi,
    // ölçünün neden değiştiğini ve nesnelerin mekâna nasıl
    // oturduğunu burası anlatıyor. Altbilgiden bulunması zordu.
    label: "Hakkımızda",
    href: "/about",
    description: "Nasıl ürettiğimiz ve ölçünün neden değiştiği",
    menu: {
      width: 420,
      groups: [
        {
          title: "ADJY",
          links: [
            { label: "Hakkımızda", href: "/about" },
            { label: "İletişim", href: "/contact" },
            { label: "Sıkça Sorulan Sorular", href: "/faq" },
          ],
        },
        {
          title: "Destek",
          links: [
            { label: "Teslimat", href: "/teslimat-politikasi" },
            { label: "İade ve İptal", href: "/iade-politikasi" },
            { label: "Sipariş Takibi", href: "/profile/orders" },
          ],
        },
      ],
    },
  },
];

/**
 * Mağaza menüsünün yedek kategori listesi — /api/categories
 * yanıt vermezse kullanılır (kategori-gecis.ts'deki yapı).
 */
export const SHOP_FALLBACK: NavMenuGroup[] = [
  { title: "Aydınlatma", href: "/products?category=aydinlatma", links: [{ label: "Masa & Gece Lambaları", href: "/products?category=aydinlatma-masa-gece" }, { label: "Litofan Lambalar", href: "/products?category=aydinlatma-litofan" }] },
  { title: "Bitki & Saksı", href: "/products?category=vazo-saksi", links: [{ label: "Vazolar", href: "/products?category=vazo-saksi-vazolar" }, { label: "Saksılar", href: "/products?category=vazo-saksi-saksilar" }, { label: "Köklendirme & Bitki Standı", href: "/products?category=vazo-saksi-koklendirme" }] },
  { title: "Dekorasyon", href: "/products?category=ev-dekorasyon", links: [{ label: "Biblo & Heykel", href: "/products?category=dekorasyon-biblo-heykel" }, { label: "Şamdan & Tütsülük", href: "/products?category=dekorasyon-samdan-tutsuluk" }, { label: "Kase & Tepsi", href: "/products?category=dekorasyon-kase-tepsi" }, { label: "Süsler", href: "/products?category=dekorasyon-susler" }] },
  { title: "Masa & Ofis", href: "/products?category=ofis-aksesuarlari", links: [{ label: "Standlar", href: "/products?category=masa-ofis-standlar" }, { label: "Masa Düzenleyiciler", href: "/products?category=masa-ofis-duzenleyiciler" }] },
  { title: "Düzen & Depolama", href: "/products?category=duzen-depolama", links: [{ label: "Duvar Rafları", href: "/products?category=duzen-duvar-raflari" }, { label: "Delikli Pano & Aksesuar", href: "/products?category=duzen-delikli-pano" }, { label: "Kutular", href: "/products?category=duzen-kutular" }] },
  { title: "Hobi & Boyama", href: "/products?category=hobi-boyama", links: [{ label: "Boyanabilir Alçı Setleri", href: "/products?category=hobi-alci-setleri" }] },
  { title: "Mimari Maketler", href: "/products?category=mimari-maket", links: [{ label: "Antik", href: "/products?category=maket-antik" }, { label: "Orta Çağ & Gotik", href: "/products?category=maket-gotik" }, { label: "Rönesans & Barok", href: "/products?category=maket-barok" }, { label: "Modern", href: "/products?category=maket-modern" }, { label: "Çağdaş", href: "/products?category=maket-cagdas" }] },
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
      { label: "Mobilya", href: "/mobilya" },
      { label: "Koleksiyonlar", href: "/collections" },
      { label: "Üret", href: "/uret" },
      { label: "Kendin Tasarla", href: "/tasarla" },
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
