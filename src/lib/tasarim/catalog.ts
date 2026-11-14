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
  malzeme: string;
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
}

/** Araçların ortak mağaza kategorisi — eşleşen kategori yoksa buraya düşer */
export const TASARIM_KATEGORISI = {
  slug: "kisiye-ozel-tasarim",
  ad: "Kendin Tasarla",
  aciklama:
    "Ölçüsünü, biçimini ve ayrıntılarını sizin belirlediğiniz ürünler. Tasarım aracında kurduğunuz model, atölyede birebir üretilir.",
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
];

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
