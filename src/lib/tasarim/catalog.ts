// ==========================================
// TASARIM ARAÇLARI — KATALOG
//
// Mağazadaki ölçüsü değişen ürünlerde müşteri bir iki
// kaydırıcı çeker. Buradaki ürünlerde ise ürünün kendisi
// kuruluyor: saksının dilim sayısı, kutunun kesitleri,
// lambanın üstündeki fotoğraf. Her biri kendi başına bir
// tasarım aracı ve modeli tarayıcıda, sıfırdan üretiyor.
//
// Araçlar public/tasarim-araclari altında duruyor ve mağaza
// sayfasının içinde bir çerçevede açılıyor. Aynı araç iki
// yüzle çalışır:
//
//   müşteri → yalnızca ürünü biçimlendiren kontroller
//   atölye  → STL, imalat paftası ve maliyet dâhil her şey;
//             yönetim panelinde, siparişin kaydıyla açılır
//
// Ürünler burada tanımlı, veritabanında değil — mobilyadaki
// gibi bunlar da satır değil üreteç. Sepetin bağlanacağı satır
// ensure.ts tarafından açılır.
// ==========================================

export interface TasarimCiktisi {
  /** Yönetim panelindeki düğmenin adı */
  ad: string;
  /** Aracın içindeki düğmenin seçicisi — tıklanınca dosya iner */
  sec: string;
  /** stl: basılacak parça · belge: pafta ve tablo · cad: diğer biçimler */
  tur: "stl" | "belge" | "cad";
}

export interface TasarimAraci {
  /** Adres, klasör adı ve SKU'nun kaynağı */
  id: string;
  ad: string;
  /** Kartta ve listelerde tek satır */
  ozet: string;
  aciklama: string;
  /** Müşterinin neyi değiştirebildiği — kartta madde olarak */
  ayarlar: string[];
  /** Tercih sırasıyla mağaza kategorileri; hiçbiri yoksa ortak kategori */
  kategoriler: string[];
  /**
   * Mağaza ve Üret'in dışında ayrıca listelendiği bölümler.
   * "mobilya": Mobilya sayfasında da gösterilir (oda ve mobilya maketi).
   */
  bolumler?: "mobilya"[];
  malzeme: string;
  /** Araçta malzeme seçimi yoksa: ürün sayfası "değiştirilebilir" demesin */
  malzemeSabit?: boolean;
  /** Varsayılan yapılandırmanın ölçümü — başlangıç fiyatı buradan */
  varsayilan: { kutleG: number; sureSaat: number };
  /** Aracın üretebildiği en küçük ve en büyük parça */
  sinir: { kutleG: [number, number]; sureSaat: [number, number] };
  /** Filament dışı parçalar: duy, ampul, NFC etiketi, pirinç yuva (₺, maliyet) */
  ekMaliyet?: number;
  ekMaliyetAciklamasi?: string;
  /** En uzun kenar 25 cm'i geçiyorsa büyük makine ücreti uygulanır */
  enUzunMm?: number;
  tabanFiyat: number;
  /** Müşterinin dosya yüklemesi şart mı (litofanda fotoğraf) */
  dosyaGerekli?: { giris: string; uyari: string };
  teslim: string;
  /** Ürün sayfasında öne çıkan üç özellik */
  vurgular: { baslik: string; metin: string }[];
  /** Ürün sayfasındaki görsellerin altyazıları — sayısı kadar görsel aranır */
  gorseller: string[];
  ciktilar: TasarimCiktisi[];
  anahtarKelimeler: string[];
  /**
   * Ürün satırının bağlanacağı mağaza etiketleri (slug). Ör. yılbaşı
   * araçları "koleksiyon-yilbasi" ile yılbaşı koleksiyonunda ve ana
   * sayfa vitrininde görünür. Satır ilk açılırken bağlanır.
   */
  etiketler?: string[];
}

/** Etiket ilk kez açılırken kullanılacak adlar */
export const ETIKET_ADLARI: Record<string, string> = {
  "koleksiyon-yilbasi": "Yılbaşı Koleksiyonu",
  "koleksiyon-kum-tepesi": "Kum Tepesi Koleksiyonu",
};

/** Araçların ortak mağaza kategorisi — eşleşen kategori yoksa buraya düşer */
export const TASARIM_KATEGORISI = {
  slug: "kisiye-ozel-tasarim",
  ad: "Kendin Tasarla",
  aciklama:
    "Ölçüsünü, biçimini ve ayrıntılarını sizin belirlediğiniz ürünler. Tasarım aracında kurduğunuz model, atölyede birebir üretilir.",
};

/**
 * Renkli baskı paketi: müşterinin kurduğu model renge göre ayrılmış
 * (tek 3MF'te her renk bir parça + renk başına STL + renk listesi).
 * Düğmeyi atölye kipinde public/tasarim-araclari/_adjy/renkli.js kurar.
 */
const RENKLI_PAKET: TasarimCiktisi = {
  ad: "Renkli baskı paketi (3MF + renk STL'leri)",
  sec: "#adjy-renkli-paket",
  tur: "stl",
};

const CAD_EKLERI = (onEk: string): TasarimCiktisi[] => [
  { ad: "OBJ", sec: `${onEk}obj`, tur: "cad" },
  { ad: "GLB", sec: `${onEk}glb`, tur: "cad" },
  { ad: "DXF", sec: `${onEk}dxf`, tur: "cad" },
  { ad: "OpenSCAD", sec: `${onEk}scad`, tur: "cad" },
];

export const TASARIM_ARACLARI: TasarimAraci[] = [
  {
    id: "saksi",
    ad: "Dokulu Saksı ve Alt Tabak",
    ozet: "Çapını, yüksekliğini ve dilimlerin burgusunu siz belirleyin.",
    aciklama:
      "Dilimli, burgulu gövdesi ve yerine kilitlenen alt tabağıyla saksı. Çapı bitkinize, yüksekliği rafınıza göre ayarlayın; dilim sayısı ve burgu açısıyla dokuyu kendiniz kurun. Alt tabak fazla suyu tutar, gövdeye çevirerek oturur.",
    ayarlar: ["Çap ve yükseklik", "Dilim sayısı ve derinliği", "Burgu açısı", "Malzeme ve renk"],
    kategoriler: ["vazo-saksi-saksilar", "vazo-saksi"],
    malzeme: "PLA",
    varsayilan: { kutleG: 509, sureSaat: 8.4 },
    sinir: { kutleG: [60, 2500], sureSaat: [1, 45] },
    tabanFiyat: 350,
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Bitkinize göre ölçü", metin: "Çapı 8 ile 22, yüksekliği 8 ile 24 santim arasında santim santim seçersiniz; saksı rafınıza ve bitkinizin köküne göre üretilir." },
      { baslik: "Dokuyu siz kurarsınız", metin: "Dilim sayısı ve burgu açısı gövdenin karakterini belirler: düz yivli de olur, sarmal da." },
      { baslik: "Kilitlenen alt tabak", metin: "Alt tabak gövdeye çevrilerek oturur ve fazla suyu tutar; saksıyı taşırken düşmez." },
    ],
    gorseller: ["Orta boy, pişmiş toprak","Sarmal doku, adaçayı yeşili","Yivli doku, kemik rengi","Büyük boy, antrasit"],
    ciktilar: [
      { ad: "Saksı STL", sec: "#btn-stl-planter", tur: "stl" },
      { ad: "Alt tabak STL", sec: "#btn-stl-tray", tur: "stl" },
      RENKLI_PAKET,
      { ad: "İmalat anteti (SVG)", sec: "#btn-modal-download-svg", tur: "belge" },
      { ad: "Maliyet tablosu (CSV)", sec: "#btn-csv-export", tur: "belge" },
      ...CAD_EKLERI("#btn-exp-"),
    ],
    anahtarKelimeler: ["ölçüye özel saksı", "dokulu saksı", "alt tabaklı saksı", "3d baskı saksı"],
  },
  {
    id: "avize",
    ad: "Dalgalı Avize",
    ozet: "Dalgasını, burgusunu ve ölçüsünü kendiniz kurduğunuz sarkıt.",
    aciklama:
      "Işığı dilimlerinden süzen, tek parça basılan avize gövdesi. Çapı ve yüksekliği odanıza göre seçin; dalga sıklığı ve burgu açısı gölgenin karakterini belirler. E27 ya da E14 duya göre üretilir, ışığın nasıl görüneceğini sipariş vermeden önce modelde görürsünüz.",
    ayarlar: ["Çap ve yükseklik", "Dalga ve burgu", "Dilim sayısı", "E27 / E14 duy", "Malzeme"],
    kategoriler: ["aydinlatma-masa-gece", "aydinlatma"],
    malzeme: "PLA",
    varsayilan: { kutleG: 216, sureSaat: 15.6 },
    sinir: { kutleG: [60, 900], sureSaat: [3, 60] },
    ekMaliyet: 110,
    ekMaliyetAciklamasi: "Duy ve ampul",
    tabanFiyat: 650,
    teslim: "Sipariş sonrası üretilir, 4–6 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Işık dilimlerden süzülür", metin: "Gövde tek parça ve ince cidarlı basılır; ışık dalgaların arasından yumuşayarak geçer." },
      { baslik: "Odanıza göre ölçü", metin: "Çapı 14 ile 25, yüksekliği 15 ile 25 santim arasında seçersiniz; dalga ve burgu sizin elinizde." },
      { baslik: "Duyu ve ampulü birlikte", metin: "E27 ya da E14 duya göre üretilir; duy ve ampul kutudan çıkar." },
    ],
    gorseller: ["Klasik dalga, E27","Mimari plise","Yalın silindir","Kompakt, E14"],
    ciktilar: [
      { ad: "Avize STL", sec: "#btn-export-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "İmalat anteti (SVG)", sec: "#btn-export-svg", tur: "belge" },
      { ad: "Üretim reçetesi (CSV)", sec: "#btn-export-csv", tur: "belge" },
      ...CAD_EKLERI("#btn-export-"),
    ],
    anahtarKelimeler: ["ölçüye özel avize", "3d baskı avize", "sarkıt lamba", "dalgalı abajur"],
  },
  {
    id: "kelepce-askilik",
    ad: "Masa Kelepçeli Kulaklık Askısı",
    ozet: "Masanızın kalınlığına göre üretilen, vidayla sıkılan askı.",
    aciklama:
      "Masayı delmeden, kenarına kelepçeyle tutunan kulaklık ve çanta askısı. Masa kalınlığınızı girin, kelepçe ona göre açılsın; askı kolunun uzunluğunu ve alt kancanın derinliğini asacağınız şeye göre ayarlayın. Vidası ve baskı pabucu birlikte gelir.",
    ayarlar: ["Masa kalınlığı", "Askı kolu uzunluğu", "Alt kanca", "Model ve malzeme"],
    kategoriler: ["masa-ofis-standlar", "ofis-aksesuarlari"],
    malzeme: "PETG",
    varsayilan: { kutleG: 111, sureSaat: 2.9 },
    sinir: { kutleG: [40, 500], sureSaat: [1, 14] },
    tabanFiyat: 350,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Masanızı delmez", metin: "Kelepçe masanın kenarına vidayla sıkılır; iz bırakmadan sökülür, başka masaya taşınır." },
      { baslik: "Masa kalınlığınıza göre", metin: "1,8 ile 5,5 santim arasındaki tablalar için üretilir; kalınlığı siz girersiniz, kelepçe ona göre açılır." },
      { baslik: "Kulaklık da çanta da", metin: "Üstte kulaklık beşiği, altta çanta ve kablo için kanca; dört ayrı gövde modelinden biri." },
    ],
    gorseller: ["Üst beşik ve alt kanca","Derin kancalı model","Kafes gövdeli model","Stüdyo modeli"],
    ciktilar: [
      { ad: "Gövde STL", sec: "#btn-stl-body", tur: "stl" },
      { ad: "Vida STL", sec: "#btn-stl-screw", tur: "stl" },
      { ad: "Pabuç STL", sec: "#btn-stl-pad", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Tüm set, tek tabla (STL)", sec: "#btn-stl-platter", tur: "cad" },
      { ad: "İmalat anteti (SVG)", sec: "#btn-export-svg", tur: "belge" },
      { ad: "Yük ve maliyet (CSV)", sec: "#btn-export-csv", tur: "belge" },
      ...CAD_EKLERI("#btn-export-"),
    ],
    anahtarKelimeler: ["kulaklık askısı", "masa kelepçesi", "masa altı askı", "çanta askısı"],
  },
  {
    id: "pcb-kutu",
    ad: "Ölçüye Özel Elektronik Kutusu",
    ozet: "Kartınızın ölçüsüne göre, kesitleri yerinde bir muhafaza.",
    aciklama:
      "Elektronik kartınız için vidalı kapaklı kutu. Kartın enini, boyunu ve gereken iç yüksekliği girin; USB, güç ve anten kesitlerini hangi duvarda istiyorsanız oraya yerleştirin. Pirinç vida yuvaları gövdeye gömülü gelir, kapak defalarca açılıp kapanabilir.",
    ayarlar: ["Kart ölçüsü ve iç yükseklik", "USB ve yan kesitler", "Havalandırma", "Vida yuvası ve malzeme"],
    kategoriler: [],
    malzeme: "PETG",
    varsayilan: { kutleG: 76, sureSaat: 4.2 },
    sinir: { kutleG: [15, 700], sureSaat: [0.8, 40] },
    ekMaliyet: 40,
    ekMaliyetAciklamasi: "Pirinç yuvalar, vidalar ve ayaklar",
    tabanFiyat: 450,
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kartınıza göre ölçü", metin: "Kartın enini, boyunu ve gereken iç yüksekliği girersiniz; kutu tam ona göre çıkar." },
      { baslik: "Kesitler yerinde", metin: "USB, güç, anten ve ağ kesitlerini istediğiniz duvara, istediğiniz konuma yerleştirirsiniz." },
      { baslik: "Defalarca açılır", metin: "Kapak pirinç vida yuvalarına vidalanır; plastik diş gibi birkaç açışta sıyırmaz." },
    ],
    gorseller: ["Raspberry Pi boyutunda kutu","Kompakt sensör kutusu","Geniş denetleyici kutusu","Güç kaynağı kutusu"],
    ciktilar: [
      { ad: "Alt kutu STL", sec: "#btn-dl-base-stl", tur: "stl" },
      { ad: "Kapak STL", sec: "#btn-dl-lid-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "İmalat anteti (SVG)", sec: "#btn-dl-svg", tur: "belge" },
      { ad: "Malzeme listesi (CSV)", sec: "#btn-dl-csv", tur: "belge" },
      ...CAD_EKLERI("#btn-dl-"),
    ],
    anahtarKelimeler: ["pcb kutusu", "elektronik kutu", "raspberry pi kutu", "esp32 muhafaza"],
  },
  {
    id: "litofan-lamba",
    ad: "Kendi Fotoğrafınla Litofan Lamba",
    ozet: "Fotoğrafınız, ışık yanınca beliren bir lambaya dönüşür.",
    aciklama:
      "Işık kapalıyken düz beyaz bir gövde; yanınca fotoğrafınız kabartmanın içinden belirir. Fotoğrafınızı yükleyin, silindir, kavisli panel ya da altıgen formdan birini seçin ve sonucu ışığı açıp kapatarak modelde görün. E14 duylu tabanıyla birlikte gelir.",
    ayarlar: ["Fotoğrafınız", "Form: silindir, panel, altıgen", "Çap ve yükseklik", "Kontrast ve yerleşim"],
    kategoriler: ["aydinlatma-litofan", "aydinlatma"],
    malzeme: "PLA",
    varsayilan: { kutleG: 250, sureSaat: 9 },
    sinir: { kutleG: [80, 900], sureSaat: [3, 40] },
    ekMaliyet: 145,
    ekMaliyetAciklamasi: "E14 duy, kablo ve ampul",
    tabanFiyat: 750,
    dosyaGerekli: {
      giris: "Fotograf_Yukle",
      uyari: "Lamba fotoğrafınızla üretilecek. Sepete eklemeden önce kendi fotoğrafınızı yükleyin.",
    },
    teslim: "Sipariş sonrası üretilir, 4–6 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Fotoğrafınız ışıkta belirir", metin: "Lamba kapalıyken düz beyaz bir gövdedir; yandığında fotoğrafınız kabartmanın içinden ortaya çıkar." },
      { baslik: "Sonucu önceden görürsünüz", metin: "Fotoğrafı yükleyip ışığı açar kapatırsınız; lamba nasıl görünecekse modelde öyle görünür." },
      { baslik: "Üç form, kendi ölçünüz", metin: "Silindir, kavisli panel ya da altıgen; çap ve yükseklik sizden. Duylu tabanıyla birlikte gelir." },
    ],
    gorseller: ["Silindir, ışık açık","Altıgen form","Kavisli panel","Portre fotoğrafıyla"],
    ciktilar: [
      { ad: "Litofan gövde STL", sec: "#btn-dl-litho-stl", tur: "stl" },
      { ad: "Taban STL", sec: "#btn-dl-base-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "İmalat anteti (SVG)", sec: "#btn-dl-antet-svg", tur: "belge" },
      { ad: "Metraj tablosu (CSV)", sec: "#btn-dl-metraj-csv", tur: "belge" },
      { ad: "OpenSCAD", sec: "#btn-dl-scad", tur: "cad" },
    ],
    anahtarKelimeler: ["litofan lamba", "fotoğraflı lamba", "kişiye özel gece lambası", "hediye lamba"],
  },
  {
    id: "nfc-qr",
    ad: "NFC ve QR Kodlu Stand",
    ozet: "Menünüz, Wi-Fi'niz ya da Instagram'ınız için kabartma QR'lı stand.",
    aciklama:
      "Telefonu yaklaştırınca ya da kodu okutunca bağlantınızı açan masa standı ve anahtarlık. Bağlantıyı ve yazıyı girin, gövde şeklini ve renk çiftini seçin; QR kod kabartma olarak, iki renkle basılır ve içine NFC etiketi gömülür. Kafe menüsü, otel Wi-Fi'si, sosyal medya için.",
    ayarlar: ["Bağlantı ve yazılar", "Stand ya da anahtarlık", "Gövde şekli ve ölçü", "Renk çifti ve simge"],
    kategoriler: [],
    malzeme: "PLA",
    varsayilan: { kutleG: 36, sureSaat: 0.85 },
    sinir: { kutleG: [8, 250], sureSaat: [0.2, 6] },
    ekMaliyet: 17,
    ekMaliyetAciklamasi: "NFC etiketi",
    tabanFiyat: 290,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Yaklaştır ya da okut", metin: "İçine gömülü NFC etiketi telefon yaklaşınca, kabartma QR kod kamera tutulunca bağlantınızı açar." },
      { baslik: "Yazı ve simge sizden", metin: "Bağlantıyı, başlığı ve alt yazıyı girersiniz; gövde şeklini ve renk çiftini seçersiniz." },
      { baslik: "Stand ya da anahtarlık", metin: "Masada duran eğik stand olarak da, halkalı anahtarlık olarak da üretilir." },
    ],
    gorseller: ["Kafe masası standı","Otel madalyonu","Anahtarlık","Sosyal medya rozeti"],
    ciktilar: [
      { ad: "Tekil üretim STL", sec: "#btn-dl-stl-unit", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Tabla dizilimi STL", sec: "#btn-dl-stl-plate", tur: "cad" },
      { ad: "İmalat anteti (SVG)", sec: "#btn-dl-antet-svg", tur: "belge" },
      { ad: "Maliyet tablosu (CSV)", sec: "#btn-dl-b2b-csv", tur: "belge" },
      ...CAD_EKLERI("#btn-dl-"),
    ],
    anahtarKelimeler: ["nfc stand", "qr menü standı", "qr kodlu anahtarlık", "kafe menü qr"],
  },
  {
    id: "lazer-uv-fikstur",
    ad: "Lazer ve UV Baskı Hizalama Fikstürü",
    ozet: "Ürününüzün ölçüsüne göre çok yuvalı, masaya oturan kalıp.",
    aciklama:
      "Lazer markalama ve UV baskıda ürünleri her seferinde aynı yere koymak için yuvalı tabla. Ürününüzün ölçüsünü girin ya da modelini yükleyin, satır ve sütun sayısını seçin; fikstür optik masanızın M6 delik aralığına göre üretilir. Kart, kalem, jeton ya da kendi parçanız için.",
    ayarlar: ["Ürün şekli ve ölçüsü", "Satır ve sütun", "Masa delik aralığı", "Kendi modeliniz", "Malzeme"],
    kategoriler: [],
    malzeme: "PETG-CF",
    varsayilan: { kutleG: 222, sureSaat: 6.8 },
    sinir: { kutleG: [40, 2500], sureSaat: [1, 60] },
    tabanFiyat: 650,
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Her seferinde aynı yer", metin: "Ürünler yuvalara oturur; markalama ya da baskı her parçada aynı noktaya düşer." },
      { baslik: "Ürününüze göre yuva", metin: "Kart, kalem, jeton için ölçü girersiniz; şekli farklıysa modelini yükler, yuvayı ondan çıkarırsınız." },
      { baslik: "Masanıza oturur", metin: "Tabla M6 delikli optik masaların 25 ve 50 mm aralığına göre delinir; vidalayıp çalışmaya başlarsınız." },
    ],
    gorseller: ["Kart fikstürü, 2×3","Kalem fikstürü","Jeton fikstürü","Matara fikstürü"],
    ciktilar: [
      { ad: "Fikstür STL", sec: "#btnExportSTL", tur: "stl" },
      RENKLI_PAKET,
      { ad: "LightBurn şablonu (SVG)", sec: "#btnExportPureLB", tur: "belge" },
      { ad: "İmalat anteti + LightBurn (SVG)", sec: "#btnExportDualSVG", tur: "belge" },
      { ad: "Teklif tablosu (CSV)", sec: "#btnExportCSV", tur: "belge" },
      { ad: "DXF", sec: "#btnExportDXF", tur: "cad" },
      { ad: "OpenSCAD", sec: "#btnExportSCAD", tur: "cad" },
    ],
    anahtarKelimeler: ["lazer fikstür", "uv baskı kalıbı", "lazer markalama jig", "hizalama kalıbı"],
  },
  {
    id: "mimari-maket",
    ad: "Ölçekli Mimari Maket",
    ozet: "Binanızı ölçeğiyle, kat kat ayrılan bir maket olarak kurun.",
    aciklama:
      "Kat kat basılan, köşe pimleriyle üst üste oturan bina maketi. Binanın enini, boyunu, kat sayısını ve ölçeği girin; balkon çıkması ve pencere oranıyla cepheyi kurun. Kendi 3B modeliniz varsa yükleyin, aynı şekilde katlara ayrılsın. Sunum ve yarışma maketi için.",
    ayarlar: ["Ölçek", "Bina ölçüsü ve kat sayısı", "Balkon ve pencere oranı", "Kendi modeliniz"],
    kategoriler: ["maket-cagdas", "mimari-maket"],
    malzeme: "PLA",
    varsayilan: { kutleG: 660, sureSaat: 17 },
    sinir: { kutleG: [30, 8000], sureSaat: [1, 300] },
    tabanFiyat: 900,
    teslim: "Sipariş sonrası üretilir; kat sayısına göre 5–10 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kat kat ayrılır", metin: "Her kat ayrı basılır ve köşe pimleriyle üst üste oturur; maketi açıp içini gösterebilirsiniz." },
      { baslik: "Ölçek sizden", metin: "1:50'den 1:500'e ölçeği seçersiniz; bina ölçüsünü metre olarak girersiniz, maket ona göre küçülür." },
      { baslik: "Kendi modeliniz de olur", metin: "Revit, Rhino ya da SketchUp'tan çıkardığınız modeli yüklersiniz; aynı şekilde katlara bölünür." },
    ],
    gorseller: ["Konut bloğu, 1:200","Ofis kulesi, 1:500","Pavyon, 1:50","Karma kullanım, 1:100"],
    ciktilar: [
      { ad: "Tüm katlar, ayrı ayrı (STL)", sec: "#btn-download-all-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Tabla dizilimi, tek dosya (STL)", sec: "#btn-exp-plate-stl", tur: "cad" },
      { ad: "Tam istif, tek dosya (STL)", sec: "#btn-exp-stacked-stl", tur: "cad" },
      { ad: "İmalat anteti (SVG)", sec: "#btn-download-svg", tur: "belge" },
      { ad: "Teklif tablosu (CSV)", sec: "#btn-download-csv", tur: "belge" },
      ...CAD_EKLERI("#btn-exp-"),
    ],
    anahtarKelimeler: ["mimari maket", "ölçekli bina maketi", "3d baskı maket", "yarışma maketi"],
  },
  {
    id: "moduler-dolap",
    ad: "Oda ve Mobilya Maketi",
    ozet: "Mutfağınızı, salonunuzu ya da gardırobunuzu ölçekli maket olarak kurun.",
    aciklama:
      "Odanızın küçültülmüş hâli: duvarları, dolapları, tezgâhı ve sehpasıyla. Odayı seçin, ölçeği belirleyin, modülleri yerleştirip ölçülerini ayarlayın. Her dolap ayrı bir parça olarak basılır ve odaya oturur — mobilya planını elinizde tutarak görmek ya da bir projeyi sunmak için.",
    ayarlar: ["Oda tipi ve ölçek", "Dolap, tezgâh ve sehpa modülleri", "Modül ölçüleri ve yerleşimi", "Yüzey renkleri"],
    kategoriler: ["mimari-maket"],
    bolumler: ["mobilya"],
    malzeme: "PLA",
    varsayilan: { kutleG: 288, sureSaat: 6.3 },
    sinir: { kutleG: [20, 3000], sureSaat: [0.5, 80] },
    tabanFiyat: 650,
    teslim: "Sipariş sonrası üretilir; modül sayısına göre 4–8 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Odanız avucunuzda", metin: "Mutfağı, salonu ya da gardırobu ölçekli olarak kurarsınız; mobilya planını elinizde çevirerek görürsünüz." },
      { baslik: "Modül modül", metin: "Dolap, tezgâh ve sehpaları tek tek ekler, ölçülerini ayarlar, odaya yerleştirirsiniz." },
      { baslik: "Her parça ayrı", metin: "Dolaplar odadan ayrı basılır ve yerine oturur; yerlerini değiştirip başka bir dizilimi deneyebilirsiniz." },
    ],
    gorseller: ["Mutfak","Salon ve sehpa","Yatak odası ve gardırop","Çalışma odası ve kitaplık"],
    ciktilar: [
      { ad: "Tam set STL", sec: "#btnExportAllSTL", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Dolap gövdeleri STL", sec: "#btnExportCabinetsSTL", tur: "cad" },
      { ad: "Sehpa ve tezgâh STL", sec: "#btnExportTablesSTL", tur: "cad" },
      { ad: "Zemin ve duvarlar STL", sec: "#btnExportRoomShellSTL", tur: "cad" },
      { ad: "İmalat paftası (SVG)", sec: "#btnExportSVG", tur: "belge" },
      { ad: "Modül ve maliyet (CSV)", sec: "#btnExportCSV", tur: "belge" },
      { ad: "1:1 kesim listesi (CSV)", sec: "#btnExportCutlistCSV", tur: "belge" },
      { ad: "Proje dosyası (JSON)", sec: "#btnExportConfigJson", tur: "cad" },
    ],
    anahtarKelimeler: ["oda maketi", "mutfak maketi", "mobilya maketi", "ölçekli dolap maketi"],
  },
  {
    id: "organizator",
    ad: "Çekmece Organizeri ve Duvar Izgarası",
    ozet: "Çekmecenizin iç ölçüsüne göre kurulan, kutuları yerinden oynamayan düzen sistemi.",
    aciklama:
      "Çekmecenizin iç genişliğini ve derinliğini girin; taban ızgarası o ölçüye göre kurulur, kutular ızgaradaki yuvalarına oturur ve çekmeceyi açıp kapatırken kaymaz. Kutuların yerini, boyunu ve iç bölmelerini modelin üstünde kendiniz düzenlersiniz. Büyük çekmecelerde taban birkaç parça hâlinde basılır ve papyon kilitlerle birbirine geçer. Aynı sistemin duvar tipi de var: duvara vidalanan ızgara panolar ve üstüne asılan kutular.",
    ayarlar: ["Çekmece ya da duvar ölçüsü", "Kutu yüksekliği", "Kutu yerleşimi ve iç bölmeler", "Hücre boyu"],
    kategoriler: ["duzen-kutular", "duzen-depolama", "masa-ofis-duzenleyiciler"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 2817, sureSaat: 56.5 },
    // En küçük: 15 × 15 cm taban, kutusuz. En büyük: 120 × 90 cm duvar, tam dolu.
    sinir: { kutleG: [25, 27000], sureSaat: [0.5, 520] },
    tabanFiyat: 250,
    teslim: "Sipariş sonrası üretilir; ölçüye ve kutu sayısına göre 5–15 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Milimetresine oturur", metin: "Çekmecenizin iç ölçüsünü milimetre olarak girersiniz; taban o ölçüye göre üretilir, kenarda kalan boşluk kör şeritlerle kapatılır." },
      { baslik: "Kutular kaymaz", metin: "Her kutu tabandaki yuvasına oturur; çekmeceyi hızlı çekseniz de yerinde kalır. Yerlerini dilediğiniz zaman değiştirirsiniz." },
      { baslik: "Yerleşimi siz kurarsınız", metin: "Kutuları tek tek ekler, siler, içlerine bölme koyarsınız; büyük, küçük ve bölmeli kutular aynı çekmecede yan yana durur." },
    ],
    gorseller: ["Çekmece organizeri, 59 × 48 cm","Üstten: kutu yerleşimi","Duvar ızgarası ve askılı kutular","Küçük çekmece, 33 × 28 cm"],
    ciktilar: [
      { ad: "Tabla ve kilit STL", sec: "#exPlates", tur: "stl" },
      { ad: "Kutular STL", sec: "#exBins", tur: "stl" },
      RENKLI_PAKET,
      { ad: "İmalat anteti (SVG)", sec: "#exSvg", tur: "belge" },
      { ad: "Parça listesi (CSV)", sec: "#exCsv", tur: "belge" },
      { ad: "Ürün görseli (PNG)", sec: "#exPng", tur: "cad" },
    ],
    anahtarKelimeler: ["çekmece organizeri", "ölçüye özel çekmece düzenleyici", "çekmece içi kutu", "duvar ızgarası", "askılı kutu"],
  },
  {
    id: "araba-yolu",
    ad: "Oyuncak Araba Yolu",
    ozet: "Virajını, rampasını, loopingini kendiniz kurduğunuz yol parçası ya da bütün bir pist.",
    aciklama:
      "Hot Wheels ölçüsündeki (1:64) oyuncak arabalar için yol parçası. Viraj, düz yol, rampa ya da looping seçin; virajın yarıçapını, dönüş açısını, ne kadar yükselip ineceğini, dış kenarın ne kadar yatacağını ve korkuluğunu, loopingin çapını siz belirleyin. Parçaları uç uca ekleyip çıkararak, sırasını değiştirerek kendi pistinizi kurabilir ya da oval, dört köşe, tepe ve looping atlayışı gibi hazır yollardan biriyle başlayabilirsiniz. Uçlar her parçada düz kalır: parçaları birbirine kilitleyen bağlantı parçaları da yolla birlikte basılır (isterseniz yedekleriyle) ya da geçmeli uçla parçalar doğrudan birbirine geçer. Yükselen ve yatık parçalar kendi ayaklarıyla masada durur.",
    ayarlar: ["Hazır yol ya da tek parça", "Kendi yolun: parça ekleme, çıkarma, sıralama, geri alma (12 parçaya kadar)", "Viraj, düz, rampa ya da looping", "Yarıçap, açı, uzunluk, looping çapı", "Yükselme, iniş, yan yatış ve dış kenar korkuluğu", "Kenar yüksekliği ve bağlantı", "Bağlantı parçaları ve yedek adedi", "Renk"],
    kategoriler: ["koleksiyon-kisiye-ozel", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 24, sureSaat: 0.8 },
    // En küçük: 60 mm düz, alçak kenar. Tek parçanın en büyüğü Ø240 looping (142 g, 3,7 sa);
    // uç uca en çok 12 parça: hazır yollar 47–193 g, 12 büyük parça ≈ 1,5 kg.
    sinir: { kutleG: [5, 1700], sureSaat: [0.3, 48] },
    tabanFiyat: 180,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Pistinizi siz çizin", metin: "Parçaları uç uca ekleyip bütün pisti ekranda kurarsınız; virajın yarıçapını ve açısını derece derece seçer, pistin kapanıp kapanmadığını hemen görürsünüz." },
      { baslik: "Virajdan fırlamaz", metin: "Dış kenar yarış pistlerindeki gibi yatar, kenarlar yükseltilebilir; hızlı giren araba yolda kalır." },
      { baslik: "Uçlar her zaman oturur", metin: "Parça ne kadar yükselse ya da yatsa da uçları düzdür: diğer parçalara takılır, yükselen ucu kendi ayaklarıyla durur." },
    ],
    gorseller: ["Looping atlayışı: iniş, düz yol ve Ø200 mm looping", "Oval pist: 4 parça, kendi üstüne kapanır", "Eğimli viraj, 90°", "Sarmal: dönerek yükselen viraj", "Tepe: çıkış, düz yol, iniş", "Korkuluklu viraj: dış kenar ortada yükselir"],
    ciktilar: [
      { ad: "Yol parçaları STL (çok parçada ZIP)", sec: "#hw-stl", tur: "stl" },
      { ad: "Bağlantı parçaları STL", sec: "#hw-baglayici-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Parça bilgisi (CSV)", sec: "#hw-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["oyuncak araba yolu", "hot wheels yol parçası", "hot wheels viraj", "araba pisti", "1:64 araba yolu", "rampa", "looping", "araba yolu looping"],
  },
  // ---------------- YILBAŞI ----------------
  {
    id: "isimli-yilbasi-susu",
    ad: "İsimli Yılbaşı Süsü",
    ozet: "Şeklini, ismini ve renklerini sizin seçtiğiniz iki renkli yılbaşı süsü.",
    aciklama:
      "Ağaca, kapıya ya da hediye paketinin üstüne kişiye özel yılbaşı süsü. Top, yıldız, çam ağacı, çan ya da kalp şeklini seçin; ismi ve alt satıra yılı ya da kısa bir sözü yazın. Yazı süsün içine kendiliğinden sığar, Türkçe harfler olduğu gibi basılır; yuvarlak, el yazısı ve modern yazı tipleri arasından seçebilirsiniz. Gövde ve kabartma yazı ayrı renkte basılır; isterseniz kenarı da yazı renginde bir çerçeveyle çevrilir. Asmak için halka ya da delik, ya da hiçbiri.",
    ayarlar: ["Top, yıldız, çam ağacı, çan ya da kalp", "İsim ve alt satır (yıl, tarih, kısa söz)", "Yuvarlak, el yazısı ya da modern yazı tipi", "Genişlik ve kalınlık", "Kenar çerçevesi ve askı", "Gövde ve yazı rengi"],
    kategoriler: ["yilbasi-susler", "yilbasi", "hediye-yilbasi", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 26, sureSaat: 0.95 },
    // En küçük: 50 mm yıldız, 2,4 mm; en büyük: 120 mm top, 6 mm
    sinir: { kutleG: [3, 120], sureSaat: [0.3, 4.5] },
    tabanFiyat: 150,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "İsim süsün içine sığar", metin: "Yazıyı yazdıkça süs kendini ayarlar: harfler şeklin içine, çerçeveye değmeden yerleşir. Türkçe harfler olduğu gibi basılır." },
      { baslik: "İki renk, kabartma yazı", metin: "Gövde ve yazı ayrı renkte basılır; yazı ve çerçeve gövdenin üstünde kabarık durur, dokununca hissedilir." },
      { baslik: "Hediyenin üstüne de olur", metin: "Halkasıyla ağaca, deliğiyle kurdeleye; askısız seçerseniz hediye paketinin üstüne ya da masaya." },
    ],
    gorseller: ["Top süs: el yazısıyla aile adı, altın yazı", "Yıldız: ilk yılbaşı, pembe yazı", "Çam ağacı: Mutlu Yıllar", "Kalp: iki isim, el yazısı"],
    ciktilar: [
      { ad: "Gövde STL", sec: "#yb-stl-govde", tur: "stl" },
      { ad: "Yazı ve çerçeve STL", sec: "#yb-stl-yazi", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Tek parça, tek renk STL", sec: "#yb-stl-tek", tur: "cad" },
      { ad: "Süs bilgisi (CSV)", sec: "#yb-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["isimli yılbaşı süsü", "kişiye özel yılbaşı süsü", "isimli ağaç süsü", "yılbaşı hediyesi", "isimli top süs", "yeni yıl süsü"],
    etiketler: ["koleksiyon-yilbasi"],
  },
  {
    id: "kar-tanesi-susu",
    ad: "Kar Tanesi Süsü",
    ozet: "Dallarını, merkezini ve desenini kendiniz kurduğunuz altı kollu kar tanesi.",
    aciklama:
      "Her biri ayrı desende, altı kollu kar tanesi süsü. Hazır desenlerden biriyle başlayın ya da ✦ Yeni desen ile kendinize özgü bir kar tanesi üretin; dal sayısını, açısını ve uzunluğunu, kol uçlarını (kristal, yuvarlak, çatal) ve merkezi (altıgen, daire, yıldız, halka) siz belirleyin. İç halka kolları ortada birbirine bağlar, dantel gibi görünür ve süsü sağlamlaştırır. Ağaca halkasıyla asılır; büyük boyları cama ve kapıya da yakışır.",
    ayarlar: ["Hazır desen ya da desen numarası", "Dal sayısı, açısı ve uzunluğu", "Kol ucu: kristal, yuvarlak, çatal, düz", "Merkez ve iç halka", "Çap, kol kalınlığı ve kalınlık", "Askı ve renk"],
    kategoriler: ["yilbasi-susler", "yilbasi", "hediye-yilbasi", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 5.5, sureSaat: 0.35 },
    sinir: { kutleG: [1.5, 60], sureSaat: [0.2, 3.5] },
    tabanFiyat: 90,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Her desen bir kez", metin: "Desen numarası dalların yerini ve açısını değiştirir; doksan dokuz desenin her biri ayrı bir kar tanesi. Beğendiğiniz numarayı tekrar seçtiğinizde aynısı gelir." },
      { baslik: "İnce ama sağlam", metin: "Kollar en az 1,6 mm kalınlıkta basılır; iç halka kolları ortada birbirine bağlar, ağaçtan düşse kırılmaz." },
      { baslik: "Ağaçtan cama", metin: "6–9 cm ağaç süsü, 12 cm ve üstü cam, kapı ve hediye paketi süsü olarak." },
    ],
    gorseller: ["Klasik: üç dal, kristal uçlar", "Dantel: iç halkalı, dört dal", "Kristal: yıldız göbek", "Yalın: uzun kollar, buz mavisi"],
    ciktilar: [
      { ad: "Kar tanesi STL", sec: "#kt-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Süs bilgisi (CSV)", sec: "#kt-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["kar tanesi süsü", "yılbaşı kar tanesi", "kar tanesi ağaç süsü", "3d baskı kar tanesi", "yılbaşı süsü"],
    etiketler: ["koleksiyon-yilbasi"],
  },
  {
    id: "burgulu-yilbasi-agaci",
    ad: "Burgulu Yılbaşı Ağacı",
    ozet: "Boyunu, kollarını ve burgusunu sizin belirlediğiniz, isterseniz ışıklı masaüstü ağacı.",
    aciklama:
      "Yıldız kesitli kollarıyla dönerek yükselen masaüstü yılbaşı ağacı. Kat kat klasik çam, düz konik ya da ince tepeli kavisli biçimden birini seçin; yüksekliğini, taban çapını, kol sayısını, kolların derinliğini ve ne kadar döneceğini siz belirleyin. LED yuvalı seçerseniz ağaç içi boş basılır, alttan konan pilli mum LED gövdeyi içten aydınlatır. Tepe yıldızı ayrı renkte basılır ve ağacın tepesindeki yuvaya geçer.",
    ayarlar: ["Kat kat, konik ya da kavisli biçim", "Yükseklik ve taban çapı", "Kol sayısı ve derinliği", "Burgu", "LED yuvası (içi boş, ışıklı)", "Tepe yıldızı ve boyu", "Ağaç ve yıldız rengi"],
    kategoriler: ["yilbasi-dekorasyon", "yilbasi", "aydinlatma-masa-gece", "ev-dekorasyon"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 126, sureSaat: 3.8 },
    sinir: { kutleG: [15, 900], sureSaat: [0.8, 28] },
    tabanFiyat: 350,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kolları siz döndürün", metin: "Kol sayısı, derinliği ve burgusu ağacın dokusunu belirler: sakin bir çamdan sarmal bir heykele kadar." },
      { baslik: "İçten ışıklı", metin: "LED yuvalı ağaç içi boş basılır; alttan konan mum LED kolların arasından yumuşak bir ışık verir." },
      { baslik: "Desteksiz, temiz yüzey", metin: "Katların altı 45° pahla açılır, iç boşluğun tavanı konidir: ağaç destek izi olmadan, tek parça basılır." },
    ],
    gorseller: ["Klasik: beş kat, altın yıldız", "Işıklı: içi boş, mum LED'li", "Modern: kavisli, altın", "Mini: masaüstü, kırmızı"],
    ciktilar: [
      { ad: "Ağaç STL", sec: "#ag-stl", tur: "stl" },
      { ad: "Yıldız STL", sec: "#ag-stl-yildiz", tur: "stl" },
      { ad: "Süs topları STL", sec: "#ag-stl-toplar", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Ağaç bilgisi (CSV)", sec: "#ag-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["masaüstü yılbaşı ağacı", "3d baskı yılbaşı ağacı", "ışıklı yılbaşı ağacı", "led yılbaşı ağacı", "burgulu çam ağacı", "yılbaşı dekorasyon"],
    etiketler: ["koleksiyon-yilbasi"],
  },
  // ---------------- KUM TEPESİ / ÇÖL ----------------
  {
    id: "kum-tepesi-pano",
    ad: "Kum Tepesi Kabartma Pano",
    ozet: "Rüzgârını, tepelerini ve dokusunu sizin kurduğunuz çöl manzarası kabartma pano.",
    aciklama:
      "Rüzgârın biçimlendirdiği kum tepeleri, duvara ya da rafa kabartma pano olarak. Rüzgârın yönünü, tepelerin aralığını, sırtların ne kadar kıvrılacağını ve kayma yüzlerinin dikliğini siz belirleyin; ✦ Yeni çöl ile her biri ayrı tepeler üretin. İnce kum dalgacıkları rüzgâr yüzünde belirir, yandan gelen ışıkta tepeler gölgeleriyle canlanır. İsterseniz kenarı düz bir pervazla çevrilir.",
    ayarlar: ["Hazır manzara ya da desen numarası", "Rüzgâr yönü ve tepe aralığı", "Sırt kıvrımı ve kayma yüzü dikliği", "Genişlik, derinlik ve tepe yüksekliği", "Kum dalgacıkları ve çerçeve", "Renk"],
    kategoriler: ["dekor-duvar", "ev-dekorasyon"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 60, sureSaat: 2.2 },
    sinir: { kutleG: [15, 420], sureSaat: [0.6, 14] },
    tabanFiyat: 450,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kendi çölünüz", metin: "Doksan dokuz desen, rüzgârın her yönü: aynı numara hep aynı tepeleri verir, beğendiğinizi saklarsınız." },
      { baslik: "Gerçek kum tepesi gibi", metin: "Rüzgâr yüzü yumuşak yükselir, kayma yüzü dik iner; ince dalgacıklar rüzgâra dik uzanır." },
      { baslik: "Işıkla değişir", metin: "Yandan vuran güneşte tepeler uzun gölgeler bırakır; gün boyu başka görünür." },
    ],
    gorseller: ["Hilal tepeler, kum rengi", "Kum denizi: sık, paralel sırtlar", "Kıvrık sırtlar, pas rengi", "Tek tepe, kemik rengi"],
    ciktilar: [
      { ad: "Pano STL", sec: "#kp-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Pano bilgisi (CSV)", sec: "#kp-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["kum tepesi pano", "çöl temalı dekor", "dune dekor", "kabartma duvar panosu", "3d baskı manzara", "çöl manzarası"],
    etiketler: ["koleksiyon-kum-tepesi"],
  },
  {
    id: "col-kurdu-kalemlik",
    ad: "Çöl Kurdu Kalemlik",
    ozet: "Boğumlarını, dişlerini ve duruşunu sizin belirlediğiniz çöl kurdu kalemlik ya da saksı.",
    aciklama:
      "Kumdan yükselen dev bir kurt: boğum boğum gövdesi ve dişlerle çevrili ağzıyla kalemlik, fırçalık ya da küçük saksı. Yüksekliğini, çapını ve gövdenin ne kadar eğileceğini, boğumların sayısını ve derinliğini, dişlerin sayısını, boyunu ve ağzın içine ne kadar eğileceğini siz belirleyin. Dişler içe doğru eğildiği için kalemler dışarı taşmaz; gövde tek parça, desteksiz basılır.",
    ayarlar: ["Hazır biçim", "Yükseklik, çap ve gövde eğriliği", "Boğum sayısı, derinliği ve pullu doku", "Diş sayısı, boyu ve içe eğimi", "Renk"],
    kategoriler: ["masa-ofis-duzenleyiciler", "ofis-aksesuarlari"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 74, sureSaat: 2.45 },
    sinir: { kutleG: [25, 320], sureSaat: [0.8, 11] },
    tabanFiyat: 380,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kumdan yükselir", metin: "Gövde tabandan yukarı doğru bir yana eğilir; boğumlar halka halka belirir, pullu doku ışığı yakalar." },
      { baslik: "Dişler kalemi tutar", metin: "Ağzın dişleri içe doğru eğilir: kalemler, fırçalar ve makaslar dik durur, dışarı devrilmez." },
      { baslik: "Desteksiz, tek parça", metin: "Boğumların altı 45°'yi aşmaz, dişler 40°'den fazla eğilmez; kurt destek izi olmadan basılır." },
    ],
    gorseller: ["Çöl kurdu: açık ağız, 18 diş", "Yaşlı kurt: derin boğumlar", "Yavru: kısa, küçük dişler", "Kurt saksı: geniş gövde"],
    ciktilar: [
      { ad: "Kalemlik STL", sec: "#ck-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Kalemlik bilgisi (CSV)", sec: "#ck-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["çöl kurdu kalemlik", "kum kurdu kalemlik", "dune temalı kalemlik", "ilginç kalemlik", "3d baskı kalemlik", "dişli saksı"],
    etiketler: ["koleksiyon-kum-tepesi"],
  },
  {
    id: "kum-dalgasi-kase",
    ad: "Kum Dalgası Kase",
    ozet: "Ölçüsünü, dalgalarını ve burgusunu sizin kurduğunuz kum dokulu kase ya da vazo.",
    aciklama:
      "Rüzgârın kumda bıraktığı dalgacıklar gibi bir yüzü yumuşak, öbür yüzü dik inen sırtlarla dokulu kase. Meyve kasesinden anahtar tabağına, derin kaseden yüksek bir kum vazosuna: profili, ağız çapını, yüksekliği ve taban genişliğini, dalgaların sayısını, derinliğini, eğikliğini ve gövde boyunca ne kadar döneceğini siz belirleyin. İsterseniz ağzın kenarı da dalgalarla iner çıkar. Duvar hiçbir yerde 45°'den fazla açılmaz: kase desteksiz basılır.",
    ayarlar: ["Hazır kase ve profil (kase, lale, düz)", "Ağız çapı, yükseklik ve taban oranı", "Dalga sayısı, derinliği ve eğikliği", "Burgu ve dalgalı ağız", "Renk"],
    kategoriler: ["dekor-kase", "ev-dekorasyon"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 97, sureSaat: 3 },
    sinir: { kutleG: [20, 480], sureSaat: [0.7, 16] },
    tabanFiyat: 380,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kumun dokusu", metin: "Dalgalar gerçek kum dalgacıkları gibi asimetrik: bir yüzü yumuşak, öbürü dik; burgu onları gövde boyunca döndürür." },
      { baslik: "Kaseden vazoya", metin: "Profil, ağız çapı ve yükseklikle aynı araçtan meyve kasesi, anahtar tabağı ya da yüksek bir vazo çıkar." },
      { baslik: "Desteksiz açılır", metin: "Duvarın açılması 45°'yi geçmeyecek şekilde sınırlanır; istenen ağız çapı sığmazsa araç söyler." },
    ],
    gorseller: ["Meyve kasesi, kum rengi", "Anahtar tabağı, dalgalı ağız", "Derin kase, okra", "Kum vazosu: yüksek, burgulu"],
    ciktilar: [
      { ad: "Kase STL", sec: "#kd-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Kase bilgisi (CSV)", sec: "#kd-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["kum dokulu kase", "dalgalı kase", "dekoratif kase", "3d baskı kase", "meyve kasesi", "çöl temalı dekor"],
    etiketler: ["koleksiyon-kum-tepesi"],
  },
  // ---------------- YILBAŞI (2) ----------------
  {
    id: "kurabiye-kalibi",
    ad: "Yılbaşı Kurabiye Kalıbı",
    ozet: "Şeklini, ölçüsünü ve derinliğini sizin seçtiğiniz yılbaşı kurabiye kalıbı.",
    aciklama:
      "Yıldız, çam, kardan adam, çan, kurabiye adam, eldiven, şeker baston, kalp, ev ya da kar tanesi: on yılbaşı şeklinden birini seçin, kurabiyenin boyunu ve kesme derinliğini belirleyin. Kalıbın bıçağı şeklin hemen dışında durur, kurabiye tam seçtiğiniz ölçüde kesilir; bıçağın ucu incelir, hamuru temiz keser. Üstteki tutma kenarı bastırırken parmağınızı korur; isterseniz kalıpları bir ipe dizip asmak için delik eklenir. Elde ılık suyla yıkayın; bulaşık makinesine ve sıcak fırına koymayın.",
    ayarlar: ["On yılbaşı şekli", "Kurabiye boyu", "Kesme derinliği", "Tutma kenarı ve asma deliği", "Renk"],
    kategoriler: ["mutfak", "yilbasi", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 8, sureSaat: 0.5 },
    sinir: { kutleG: [3, 40], sureSaat: [0.25, 2.5] },
    tabanFiyat: 90,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Tam ölçüde keser", metin: "Bıçak şeklin dışında durur: 75 mm seçtiyseniz kurabiye 75 mm çıkar." },
      { baslik: "Keskin, temiz kenar", metin: "Bıçağın son 3 mm'si incelir; hamur yırtılmadan, kenarları düzgün kesilir." },
      { baslik: "Parmağı korur", metin: "Geniş tutma kenarı bastırırken avucunuza oturur; deliğiyle kalıplar bir ipe dizilip asılır." },
    ],
    gorseller: ["Yıldız, kırmızı", "Kurabiye adam, yeşil", "Kardan adam, beyaz", "Kar tanesi, buz mavisi"],
    ciktilar: [
      { ad: "Kalıp STL", sec: "#kk-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Kalıp bilgisi (CSV)", sec: "#kk-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["yılbaşı kurabiye kalıbı", "kurabiye kalıbı", "kurabiye adam kalıbı", "yıldız kurabiye kalıbı", "kişiye özel kurabiye kalıbı", "3d baskı kurabiye kalıbı"],
    etiketler: ["koleksiyon-yilbasi"],
  },
  {
    id: "isimli-sofra-karti",
    ad: "İsimli Yılbaşı Sofra Kartı",
    ozet: "Misafirin adı, motif ve renkleriyle ayaklı yılbaşı sofra kartı.",
    aciklama:
      "Yılbaşı sofrasında her tabağın başında misafirin adı. İsmi ve alt satırı yazın, yuvarlak, el yazısı ya da modern yazı tipini, çam, yıldız, kar tanesi, çan ya da hediye motifini seçin. Kart, yazı ve ayak ayrı renkte basılabilir; yazı ve motif kartın üstünde kabarır, kart ayağın yuvasına dik oturur. Sofradan sonra misafirinize küçük bir hatıra.",
    ayarlar: ["Hazır kart", "İsim ve alt satır", "Yazı tipi", "Motif ve kenar çerçevesi", "Genişlik ve yükseklik, ayak", "Kart, yazı ve ayak rengi"],
    kategoriler: ["yilbasi", "hediye-yilbasi", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 24, sureSaat: 1.05 },
    sinir: { kutleG: [8, 60], sureSaat: [0.4, 2.5] },
    tabanFiyat: 90,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Her misafire bir kart", metin: "İsimler Türkçe harfleriyle basılır; yazı kartın içine kendiliğinden sığar." },
      { baslik: "Üç renk", metin: "Kart, kabartma yazı ve ayak ayrı renkte: çam yeşiline altın, kırmızıya beyaz." },
      { baslik: "Sofradan sonra hatıra", metin: "Kart ayağından çıkar; misafiriniz evine götürür, ağaca ya da rafa koyar." },
    ],
    gorseller: ["Klasik: çam, el yazısı, altın", "Yıldızlı: siyah ve altın", "Kar tanesi: beyaz ve buz mavisi", "Kırmızı çan"],
    ciktilar: [
      { ad: "Kart STL", sec: "#sk-stl-kart", tur: "stl" },
      { ad: "Yazı ve motif STL", sec: "#sk-stl-yazi", tur: "stl" },
      { ad: "Ayak STL", sec: "#sk-stl-ayak", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Kart bilgisi (CSV)", sec: "#sk-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["isimli sofra kartı", "yılbaşı sofra kartı", "isimlik", "masa isimliği", "yılbaşı masa süsü", "kişiye özel isimlik"],
    etiketler: ["koleksiyon-yilbasi"],
  },
  {
    id: "isikli-yilbasi-feneri",
    ad: "Işıklı Yılbaşı Feneri",
    ozet: "Deseni ve yazısı duvarına işlenmiş, içine mum LED konan yılbaşı feneri.",
    aciklama:
      "İçine pilli mum LED konunca deseni ışıkla beliren fener. Çam ormanı, kar yağışı ya da yıldızlı gece desenlerinden birini seçin; desen numarası ve yoğunlukla kendinize özgü bir gece kurun, isterseniz ön yüzüne bir isim ya da \"Mutlu Yıllar\" yazın. Desen duvarın kalınlığına işlenir: ışık ince yerlerden parlar, kalın yerlerde gölge olur; isterseniz tersine motifler parlar. Silindir, fıçı ya da konik biçim; fener mum LED'in üstüne kapatılır.",
    ayarlar: ["Hazır fener ve desen (orman, kar, yıldızlı gece)", "Desen numarası ve yoğunluk", "Motifler parlasın", "Yazı ve yazı tipi", "Çap, yükseklik ve biçim", "Renk"],
    kategoriler: ["aydinlatma-masa-gece", "aydinlatma", "yilbasi"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 61, sureSaat: 3.3 },
    sinir: { kutleG: [25, 200], sureSaat: [1.2, 11] },
    ekMaliyet: 60,
    ekMaliyetAciklamasi: "Pilli mum LED",
    tabanFiyat: 450,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Işıkla beliren desen", metin: "Gündüz yalnızca hafif bir kabartma; mum LED yanınca çam ormanı, kar taneleri ya da yıldızlı gece ortaya çıkar." },
      { baslik: "Sizin geceniz", metin: "Desen numarası ve yoğunlukla her fener ayrı; ön yüzüne aile adı ya da kısa bir söz." },
      { baslik: "Mum LED'iyle birlikte", metin: "Fener pilli mum LED'in üstüne kapatılır; LED kutudan çıkar." },
    ],
    gorseller: ["Çam ormanı, ışık yanınca", "Kar yağışı: parlayan kar taneleri", "Yıldızlı gece, hilal ay", "İsimli: Mutlu Yıllar"],
    ciktilar: [
      { ad: "Fener STL", sec: "#yf-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Fener bilgisi (CSV)", sec: "#yf-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["yılbaşı feneri", "litofan fener", "led mumluk", "ışıklı yılbaşı süsü", "isimli fener", "yılbaşı dekorasyon"],
    etiketler: ["koleksiyon-yilbasi"],
  },
];

/** Belirli bir bölümde (ör. Mobilya) ayrıca listelenen araçlar */
export function bolumAraclari(bolum: "mobilya"): TasarimAraci[] {
  return TASARIM_ARACLARI.filter((a) => a.bolumler?.includes(bolum));
}

export function aracBul(id: string | null | undefined): TasarimAraci | null {
  if (!id) return null;
  return TASARIM_ARACLARI.find((a) => a.id === id) ?? null;
}

/** Ürünün tanıtım sayfası */
export function aracAdresi(id: string): string {
  return `/tasarla/${id}`;
}

/** Tasarım aracının açıldığı sayfa — ürün sayfasından gidilir */
export function aracOzellestirmeAdresi(id: string): string {
  return `/tasarla/${id}/ozellestir`;
}

/** Aracın müşteri yüzü (çerçevenin kaynağı) */
export function aracKaynagi(id: string): string {
  return `/tasarim-araclari/${id}/index.html`;
}

/** Aracın atölye yüzü — yalnızca yönetici oturumuyla sunulur */
export function aracUretimKaynagi(id: string): string {
  return `/admin/uretim-araci/${id}/index.html`;
}

/** Ürün kartlarında ve sepette kullanılan hazır görsel */
export function aracGorseli(id: string): string {
  return `/tasarim-araclari/_gorsel/${id}.jpg`;
}

/**
 * Ürün sayfasındaki görseller, altyazılarıyla. İlki kart görseliyle
 * aynı dosya; sonrakiler "-2", "-3"… ekiyle durur. Hepsi aracın
 * kendi 3B sahnesinden alındı: her biri gerçekten üretilebilen bir
 * yapılandırmayı gösterir.
 */
export function aracGorselleri(arac: TasarimAraci): { adres: string; altyazi: string }[] {
  return arac.gorseller.map((altyazi, i) => ({
    adres:
      i === 0
        ? aracGorseli(arac.id)
        : `/tasarim-araclari/_gorsel/${arac.id}-${i + 1}.jpg`,
    altyazi,
  }));
}

/** Veritabanındaki ürünün adres parçası */
export function tasarimUrunSlug(aracId: string): string {
  return `tasarla-${aracId}`;
}

/** Slug bir tasarım aracı ürününe mi ait — ürün sayfası yönlendirmesi için */
export function slugdanAracId(slug: string): string | null {
  if (!slug.startsWith("tasarla-")) return null;
  const id = slug.slice("tasarla-".length);
  return TASARIM_ARACLARI.some((a) => a.id === id) ? id : null;
}
