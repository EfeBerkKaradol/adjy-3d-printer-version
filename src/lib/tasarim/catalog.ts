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
  /**
   * Üretim projesinde aynı adı taşıyan STL'ler tek nesnedir: aynı orijinde,
   * üst üste oturan renk parçaları (levha + kabartma yazı). Adsız STL
   * kendi başına bir parçadır, rengine göre ayrı tablaya dizilir.
   */
  nesne?: string;
  /**
   * Dosyanın tamamı tek filamenttir (fotoğraf araçlarında bir rengin bütün
   * bölgeleri). Rengi kabuk kabuk değil, dosyanın çoğunluğundan okunur:
   * binlerce küçük bölgede tek tek eşleştirme yanılabilir.
   */
  tekRenk?: boolean;
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
  /**
   * Varsayılan kurulumun KDV dâhil satış fiyatı (₺): Türkiye'de benzer
   * 3B baskı ürünlerin ortalama fiyatına göre seçildi. Ölçü ya da
   * ayrıntı değişince fiyat maliyetle aynı oranda değişir (pricing.ts).
   */
  piyasaFiyati: number;
  /** Müşterinin dosya yüklemesi şart mı (litofanda fotoğraf) */
  dosyaGerekli?: { giris: string; uyari: string };
  teslim: string;
  /** Ürün sayfasında öne çıkan üç özellik */
  vurgular: { baslik: string; metin: string }[];
  /** Ürün sayfasındaki görsellerin altyazıları — sayısı kadar görsel aranır */
  gorseller: string[];
  /**
   * Özelleştirme animasyonu var mı (_gorsel/<id>.mp4): ayarlar değiştikçe
   * ürünün aldığı biçimler, ev ortamında çizilmiş kısa döngü
   * (scripts/urun-renderleri.py --animasyon).
   */
  animasyon?: boolean;
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
  "koleksiyon-oyun-odasi": "Oyun Odası Koleksiyonu",
  "koleksiyon-ani": "Anı Koleksiyonu",
};

/** Araçların ortak mağaza kategorisi — eşleşen kategori yoksa buraya düşer */
export const TASARIM_KATEGORISI = {
  slug: "kisiye-ozel-tasarim",
  ad: "Kendin Tasarla",
  aciklama:
    "Ölçüsünü, biçimini ve ayrıntılarını sizin belirlediğiniz ürünler. Tasarım aracında kurduğunuz model, atölyede birebir üretilir.",
};

/**
 * Renkli baskı çıktıları (public/tasarim-araclari/_adjy/renkli.js; atölye
 * kipinde, her araçta).
 *
 *   üretim projesi → basılan dosya. Aracın baskı yönündeki parça
 *           STL'lerinden kurulur (aşağıdaki "stl" çıktıları), sipariş
 *           adedi kadar dizilir. Tek tablaya sığıyorsa tek tabla (farklı
 *           renkte parçalar nesne nesne basılır); sığmıyorsa tek renkli
 *           parçalar rengine göre ayrı tablada, çok renkli nesneler
 *           ("nesne" adı aynı olan STL'ler) kendi tablasında. Filament
 *           renkleri ve yazıcı profili içinde.
 *   paket → modelin ekrandaki (montajlı) duruşu: renk başına STL + renk
 *           listesi. Bu duruş basılmaz; renkleri görmek içindir.
 */
export const RENKLI_3MF_SECICI = "#adjy-renkli-3mf";
export const RENKLI_PAKET_SECICI = "#adjy-renkli-paket";

const RENKLI_PAKET: TasarimCiktisi = {
  ad: "Renkli baskı paketi (3MF + renk STL'leri)",
  sec: RENKLI_PAKET_SECICI,
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
    ad: "Ölçüye Özel Burgulu Saksı",
    ozet: "Bitkinize göre çap ve boy; dilimleri ve burgusu sizden, alt tabağı yerine kilitlenir.",
    aciklama:
      "Dilimli, burgulu gövdesi ve yerine kilitlenen alt tabağıyla saksı. Çapı bitkinize, yüksekliği rafınıza göre ayarlayın; dilim sayısı ve burgu açısıyla dokuyu kendiniz kurun. Alt tabak fazla suyu tutar, gövdeye çevirerek oturur.",
    ayarlar: ["Çap ve yükseklik", "Dilim sayısı ve derinliği", "Burgu açısı", "Malzeme ve renk"],
    kategoriler: ["vazo-saksi-saksilar", "vazo-saksi"],
    malzeme: "PLA",
    varsayilan: { kutleG: 509, sureSaat: 8.4 },
    sinir: { kutleG: [60, 2500], sureSaat: [1, 45] },
    piyasaFiyati: 1199,
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Bitkinize göre ölçü", metin: "Çapı 8 ile 22, yüksekliği 8 ile 24 santim arasında santim santim seçersiniz; saksı rafınıza ve bitkinizin köküne göre üretilir." },
      { baslik: "Dokuyu siz kurarsınız", metin: "Dilim sayısı ve burgu açısı gövdenin karakterini belirler: düz yivli de olur, sarmal da." },
      { baslik: "Kilitlenen alt tabak", metin: "Alt tabak gövdeye çevrilerek oturur ve fazla suyu tutar; saksıyı taşırken düşmez." },
    ],
    gorseller: ["Evde: masanın üstünde", "Sarmal doku, adaçayı yeşili", "Yivli doku, kemik rengi", "Büyük boy, antrasit", "Orta boy, pişmiş toprak"],
    animasyon: true,
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
    ad: "Dalgalı Sarkıt Avize",
    ozet: "Işığı dalgalarından süzen sarkıt; çapı, burgusu ve duyu odanıza göre.",
    aciklama:
      "Işığı dilimlerinden süzen, tek parça basılan avize gövdesi. Çapı ve yüksekliği odanıza göre seçin; dalga sıklığı ve burgu açısı gölgenin karakterini belirler. E27 ya da E14 duya göre üretilir, ışığın nasıl görüneceğini sipariş vermeden önce modelde görürsünüz.",
    ayarlar: ["Çap ve yükseklik", "Dalga ve burgu", "Dilim sayısı", "E27 / E14 duy", "Malzeme"],
    kategoriler: ["aydinlatma-masa-gece", "aydinlatma"],
    malzeme: "PLA",
    varsayilan: { kutleG: 216, sureSaat: 15.6 },
    sinir: { kutleG: [60, 900], sureSaat: [3, 60] },
    ekMaliyet: 110,
    ekMaliyetAciklamasi: "Duy ve ampul",
    piyasaFiyati: 1399,
    teslim: "Sipariş sonrası üretilir, 4–6 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Işık dilimlerden süzülür", metin: "Gövde tek parça ve ince cidarlı basılır; ışık dalgaların arasından yumuşayarak geçer." },
      { baslik: "Odanıza göre ölçü", metin: "Çapı 14 ile 25, yüksekliği 15 ile 25 santim arasında seçersiniz; dalga ve burgu sizin elinizde." },
      { baslik: "Duyu ve ampulü birlikte", metin: "E27 ya da E14 duya göre üretilir; duy ve ampul kutudan çıkar." },
    ],
    gorseller: ["Evde: yemek masasının üstünde asılı", "Mimari plise", "Yalın silindir", "Kompakt, E14", "Klasik dalga, E27"],
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
    ozet: "Masayı delmeden kenarına sıkılır; kelepçe masanızın kalınlığına göre açılır.",
    aciklama:
      "Masayı delmeden, kenarına kelepçeyle tutunan kulaklık ve çanta askısı. Masa kalınlığınızı girin, kelepçe ona göre açılsın; askı kolunun uzunluğunu ve alt kancanın derinliğini asacağınız şeye göre ayarlayın. Vidası ve baskı pabucu birlikte gelir.",
    ayarlar: ["Masa kalınlığı", "Askı kolu uzunluğu", "Alt kanca", "Model ve malzeme"],
    kategoriler: ["masa-ofis-standlar", "ofis-aksesuarlari"],
    malzeme: "PETG",
    varsayilan: { kutleG: 111, sureSaat: 2.9 },
    sinir: { kutleG: [40, 500], sureSaat: [1, 14] },
    piyasaFiyati: 449,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Masanızı delmez", metin: "Kelepçe masanın kenarına vidayla sıkılır; iz bırakmadan sökülür, başka masaya taşınır." },
      { baslik: "Masa kalınlığınıza göre", metin: "1,8 ile 5,5 santim arasındaki tablalar için üretilir; kalınlığı siz girersiniz, kelepçe ona göre açılır." },
      { baslik: "Kulaklık da çanta da", metin: "Üstte kulaklık beşiği, altta çanta ve kablo için kanca; dört ayrı gövde modelinden biri." },
    ],
    gorseller: ["Evde: çalışma masasının kenarında, kulaklıkla", "Derin kancalı model", "Kafes gövdeli model", "Stüdyo modeli", "Üst beşik ve alt kanca"],
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
    ozet: "Kartınızın ölçüsünde, USB ve güç kesitleri yerinde, vidalı kapaklı muhafaza.",
    aciklama:
      "Elektronik kartınız için vidalı kapaklı kutu. Kartın enini, boyunu ve gereken iç yüksekliği girin; USB, güç ve anten kesitlerini hangi duvarda istiyorsanız oraya yerleştirin. Pirinç vida yuvaları gövdeye gömülü gelir, kapak defalarca açılıp kapanabilir.",
    ayarlar: ["Kart ölçüsü ve iç yükseklik", "USB ve yan kesitler", "Havalandırma", "Vida yuvası ve malzeme"],
    kategoriler: [],
    malzeme: "PETG",
    varsayilan: { kutleG: 76, sureSaat: 4.2 },
    sinir: { kutleG: [15, 700], sureSaat: [0.8, 40] },
    ekMaliyet: 40,
    ekMaliyetAciklamasi: "Pirinç yuvalar, vidalar ve ayaklar",
    piyasaFiyati: 649,
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kartınıza göre ölçü", metin: "Kartın enini, boyunu ve gereken iç yüksekliği girersiniz; kutu tam ona göre çıkar." },
      { baslik: "Kesitler yerinde", metin: "USB, güç, anten ve ağ kesitlerini istediğiniz duvara, istediğiniz konuma yerleştirirsiniz." },
      { baslik: "Defalarca açılır", metin: "Kapak pirinç vida yuvalarına vidalanır; plastik diş gibi birkaç açışta sıyırmaz." },
    ],
    gorseller: ["Evde: masanın üstünde", "Kompakt sensör kutusu", "Geniş denetleyici kutusu", "Güç kaynağı kutusu", "Raspberry Pi boyutunda kutu"],
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
    ad: "Fotoğraflı Litofan Lamba",
    ozet: "Kapalıyken düz beyaz; ışığı yakınca fotoğrafınız gövdenin içinden belirir.",
    aciklama:
      "Işık kapalıyken düz beyaz bir gövde; yanınca fotoğrafınız kabartmanın içinden belirir. Fotoğrafınızı yükleyin, silindir, kavisli panel ya da altıgen formdan birini seçin ve sonucu ışığı açıp kapatarak modelde görün. E14 duylu tabanıyla birlikte gelir.",
    ayarlar: ["Fotoğrafınız", "Form: silindir, panel, altıgen", "Çap ve yükseklik", "Kontrast ve yerleşim"],
    kategoriler: ["aydinlatma-litofan", "aydinlatma"],
    malzeme: "PLA",
    varsayilan: { kutleG: 250, sureSaat: 9 },
    sinir: { kutleG: [80, 900], sureSaat: [3, 40] },
    ekMaliyet: 145,
    ekMaliyetAciklamasi: "E14 duy, kablo ve ampul",
    piyasaFiyati: 1099,
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
    ad: "NFC'li QR Kod Standı",
    ozet: "Telefonu yaklaştırınca ya da kodu okutunca menünüz, Wi-Fi'niz ya da Instagram'ınız açılır.",
    aciklama:
      "Telefonu yaklaştırınca ya da kodu okutunca bağlantınızı açan masa standı ve anahtarlık. Bağlantıyı ve yazıyı girin, gövde şeklini ve renk çiftini seçin; QR kod kabartma olarak, iki renkle basılır ve içine NFC etiketi gömülür. Kafe menüsü, otel Wi-Fi'si, sosyal medya için.",
    ayarlar: ["Bağlantı ve yazılar", "Stand ya da anahtarlık", "Gövde şekli ve ölçü", "Renk çifti ve simge"],
    kategoriler: [],
    malzeme: "PLA",
    varsayilan: { kutleG: 36, sureSaat: 0.85 },
    sinir: { kutleG: [8, 250], sureSaat: [0.2, 6] },
    ekMaliyet: 17,
    ekMaliyetAciklamasi: "NFC etiketi",
    piyasaFiyati: 399,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Yaklaştır ya da okut", metin: "İçine gömülü NFC etiketi telefon yaklaşınca, kabartma QR kod kamera tutulunca bağlantınızı açar." },
      { baslik: "Yazı ve simge sizden", metin: "Bağlantıyı, başlığı ve alt yazıyı girersiniz; gövde şeklini ve renk çiftini seçersiniz." },
      { baslik: "Stand ya da anahtarlık", metin: "Masada duran eğik stand olarak da, halkalı anahtarlık olarak da üretilir." },
    ],
    gorseller: ["Evde: masanın üstünde", "Otel madalyonu, lacivert ve altın", "Anahtarlık, zümrüt ve krem", "Sosyal medya rozeti, siyah ve kırmızı", "Yatay kart, beyaz ve siyah", "Sekizgen plaka, lacivert ve altın", "Kafe masası standı, siyah ve kemik beyazı"],
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
    piyasaFiyati: 999,
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Her seferinde aynı yer", metin: "Ürünler yuvalara oturur; markalama ya da baskı her parçada aynı noktaya düşer." },
      { baslik: "Ürününüze göre yuva", metin: "Kart, kalem, jeton için ölçü girersiniz; şekli farklıysa modelini yükler, yuvayı ondan çıkarırsınız." },
      { baslik: "Masanıza oturur", metin: "Tabla M6 delikli optik masaların 25 ve 50 mm aralığına göre delinir; vidalayıp çalışmaya başlarsınız." },
    ],
    gorseller: ["Evde: masanın üstünde", "Kalem fikstürü", "Jeton fikstürü", "Matara fikstürü", "Kart fikstürü, 2×3"],
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
    piyasaFiyati: 2699,
    teslim: "Sipariş sonrası üretilir; kat sayısına göre 5–10 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kat kat ayrılır", metin: "Her kat ayrı basılır ve köşe pimleriyle üst üste oturur; maketi açıp içini gösterebilirsiniz." },
      { baslik: "Ölçek sizden", metin: "1:50'den 1:500'e ölçeği seçersiniz; bina ölçüsünü metre olarak girersiniz, maket ona göre küçülür." },
      { baslik: "Kendi modeliniz de olur", metin: "Revit, Rhino ya da SketchUp'tan çıkardığınız modeli yüklersiniz; aynı şekilde katlara bölünür." },
    ],
    gorseller: ["Evde: masanın üstünde", "Ofis kulesi, 1:500", "Pavyon, 1:50", "Karma kullanım, 1:100", "Konut bloğu, 1:200"],
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
    piyasaFiyati: 1099,
    teslim: "Sipariş sonrası üretilir; modül sayısına göre 4–8 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Odanız avucunuzda", metin: "Mutfağı, salonu ya da gardırobu ölçekli olarak kurarsınız; mobilya planını elinizde çevirerek görürsünüz." },
      { baslik: "Modül modül", metin: "Dolap, tezgâh ve sehpaları tek tek ekler, ölçülerini ayarlar, odaya yerleştirirsiniz." },
      { baslik: "Her parça ayrı", metin: "Dolaplar odadan ayrı basılır ve yerine oturur; yerlerini değiştirip başka bir dizilimi deneyebilirsiniz." },
    ],
    gorseller: ["Evde: masanın üstünde", "Salon ve sehpa", "Yatak odası ve gardırop", "Çalışma odası ve kitaplık", "Mutfak"],
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
    ad: "Çekmece Düzenleyici ve Duvar Izgarası",
    ozet: "Çekmecenizin iç ölçüsüne milimetresine oturan, kutuları kaymayan düzen sistemi.",
    aciklama:
      "Çekmecenizin iç genişliğini ve derinliğini girin; taban ızgarası o ölçüye göre kurulur, kutular ızgaradaki yuvalarına oturur ve çekmeceyi açıp kapatırken kaymaz. Kutuların yerini, boyunu ve iç bölmelerini modelin üstünde kendiniz düzenlersiniz. Büyük çekmecelerde taban birkaç parça hâlinde basılır ve papyon kilitlerle birbirine geçer. Aynı sistemin duvar tipi de var: duvara vidalanan ızgara panolar ve üstüne asılan kutular.",
    ayarlar: ["Çekmece ya da duvar ölçüsü", "Kutu yüksekliği", "Kutu yerleşimi ve iç bölmeler", "Hücre boyu"],
    kategoriler: ["duzen-kutular", "duzen-depolama", "masa-ofis-duzenleyiciler"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 2817, sureSaat: 56.5 },
    // En küçük: 15 × 15 cm taban, kutusuz. En büyük: 120 × 90 cm duvar, tam dolu.
    sinir: { kutleG: [25, 27000], sureSaat: [0.5, 520] },
    piyasaFiyati: 5699,
    teslim: "Sipariş sonrası üretilir; ölçüye ve kutu sayısına göre 5–15 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Milimetresine oturur", metin: "Çekmecenizin iç ölçüsünü milimetre olarak girersiniz; taban o ölçüye göre üretilir, kenarda kalan boşluk kör şeritlerle kapatılır." },
      { baslik: "Kutular kaymaz", metin: "Her kutu tabandaki yuvasına oturur; çekmeceyi hızlı çekseniz de yerinde kalır. Yerlerini dilediğiniz zaman değiştirirsiniz." },
      { baslik: "Yerleşimi siz kurarsınız", metin: "Kutuları tek tek ekler, siler, içlerine bölme koyarsınız; büyük, küçük ve bölmeli kutular aynı çekmecede yan yana durur." },
    ],
    gorseller: ["Evde: komodinin çekmecesinde", "Evde: duvar ızgarası, tezgâhın üstünde", "Üstten: kutu yerleşimi", "Duvar ızgarası ve askılı kutular", "Küçük çekmece, 33 × 28 cm", "Çekmece organizeri, 59 × 48 cm"],
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
    ad: "Oyuncak Araba Pisti",
    ozet: "Virajı, rampası ve loopingi sizden: tek parça yol ya da uç uca eklenen bütün bir pist.",
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
    piyasaFiyati: 299,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Pistinizi siz çizin", metin: "Parçaları uç uca ekleyip bütün pisti ekranda kurarsınız; virajın yarıçapını ve açısını derece derece seçer, pistin kapanıp kapanmadığını hemen görürsünüz." },
      { baslik: "Virajdan fırlamaz", metin: "Dış kenar yarış pistlerindeki gibi yatar, kenarlar yükseltilebilir; hızlı giren araba yolda kalır." },
      { baslik: "Uçlar her zaman oturur", metin: "Parça ne kadar yükselse ya da yatsa da uçları düzdür: diğer parçalara takılır, yükselen ucu kendi ayaklarıyla durur." },
    ],
    gorseller: ["Evde: masanın üstünde", "Oval pist: 4 parça, kendi üstüne kapanır", "Eğimli viraj, 90°", "Sarmal: dönerek yükselen viraj", "Tepe: çıkış, düz yol, iniş", "Korkuluklu viraj: dış kenar ortada yükselir", "Looping atlayışı: iniş, düz yol ve Ø200 mm looping"],
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
    ozet: "Adı yazılı, iki renkli ağaç süsü; şekli ve renkleri sizden.",
    aciklama:
      "Ağaca, kapıya ya da hediye paketinin üstüne kişiye özel yılbaşı süsü. Top, yıldız, çam ağacı, çan ya da kalp şeklini seçin; ismi ve alt satıra yılı ya da kısa bir sözü yazın. Yazı süsün içine kendiliğinden sığar, Türkçe harfler olduğu gibi basılır; yuvarlak, el yazısı ve modern yazı tipleri arasından seçebilirsiniz. Gövde ve kabartma yazı ayrı renkte basılır; isterseniz kenarı da yazı renginde bir çerçeveyle çevrilir. Asmak için halka ya da delik, ya da hiçbiri.",
    ayarlar: ["Top, yıldız, çam ağacı, çan ya da kalp", "İsim ve alt satır (yıl, tarih, kısa söz)", "Yuvarlak, el yazısı ya da modern yazı tipi", "Genişlik ve kalınlık", "Kenar çerçevesi ve askı", "Gövde ve yazı rengi"],
    kategoriler: ["yilbasi-susler", "yilbasi", "hediye-yilbasi", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 26, sureSaat: 0.95 },
    // En küçük: 50 mm yıldız, 2,4 mm; en büyük: 120 mm top, 6 mm
    sinir: { kutleG: [3, 120], sureSaat: [0.3, 4.5] },
    piyasaFiyati: 279,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "İsim süsün içine sığar", metin: "Yazıyı yazdıkça süs kendini ayarlar: harfler şeklin içine, çerçeveye değmeden yerleşir. Türkçe harfler olduğu gibi basılır." },
      { baslik: "İki renk, kabartma yazı", metin: "Gövde ve yazı ayrı renkte basılır; yazı ve çerçeve gövdenin üstünde kabarık durur, dokununca hissedilir." },
      { baslik: "Hediyenin üstüne de olur", metin: "Halkasıyla ağaca, deliğiyle kurdeleye; askısız seçerseniz hediye paketinin üstüne ya da masaya." },
    ],
    gorseller: ["Evde: masanın üstünde", "Yıldız: ilk yılbaşı, pembe yazı", "Çam ağacı: Mutlu Yıllar", "Kalp: iki isim, el yazısı", "Top süs: el yazısıyla aile adı, altın yazı"],
    animasyon: true,
    ciktilar: [
      { ad: "Gövde STL", sec: "#yb-stl-govde", tur: "stl", nesne: "Süs" },
      { ad: "Yazı ve çerçeve STL", sec: "#yb-stl-yazi", tur: "stl", nesne: "Süs" },
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
    piyasaFiyati: 229,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Her desen bir kez", metin: "Desen numarası dalların yerini ve açısını değiştirir; doksan dokuz desenin her biri ayrı bir kar tanesi. Beğendiğiniz numarayı tekrar seçtiğinizde aynısı gelir." },
      { baslik: "İnce ama sağlam", metin: "Kollar en az 1,6 mm kalınlıkta basılır; iç halka kolları ortada birbirine bağlar, ağaçtan düşse kırılmaz." },
      { baslik: "Ağaçtan cama", metin: "6–9 cm ağaç süsü, 12 cm ve üstü cam, kapı ve hediye paketi süsü olarak." },
    ],
    gorseller: ["Evde: masanın üstünde", "Dantel: iç halkalı, dört dal", "Kristal: yıldız göbek", "Yalın: uzun kollar, buz mavisi", "Klasik: üç dal, kristal uçlar"],
    animasyon: true,
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
    piyasaFiyati: 649,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kolları siz döndürün", metin: "Kol sayısı, derinliği ve burgusu ağacın dokusunu belirler: sakin bir çamdan sarmal bir heykele kadar." },
      { baslik: "İçten ışıklı", metin: "LED yuvalı ağaç içi boş basılır; alttan konan mum LED kolların arasından yumuşak bir ışık verir." },
      { baslik: "Desteksiz, temiz yüzey", metin: "Katların altı 45° pahla açılır, iç boşluğun tavanı konidir: ağaç destek izi olmadan, tek parça basılır." },
    ],
    gorseller: ["Evde: masanın üstünde", "Işıklı: içi boş, mum LED'li", "Modern: kavisli, altın", "Mini: masaüstü, kırmızı", "Klasik: beş kat, altın yıldız"],
    animasyon: true,
    ciktilar: [
      { ad: "Ağaç STL", sec: "#ag-stl", tur: "stl", nesne: "Ağaç" },
      { ad: "Yıldız STL", sec: "#ag-stl-yildiz", tur: "stl" },
      { ad: "Süs topları STL", sec: "#ag-stl-toplar", tur: "stl", nesne: "Ağaç" },
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
    piyasaFiyati: 449,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kendi çölünüz", metin: "Doksan dokuz desen, rüzgârın her yönü: aynı numara hep aynı tepeleri verir, beğendiğinizi saklarsınız." },
      { baslik: "Gerçek kum tepesi gibi", metin: "Rüzgâr yüzü yumuşak yükselir, kayma yüzü dik iner; ince dalgacıklar rüzgâra dik uzanır." },
      { baslik: "Işıkla değişir", metin: "Yandan vuran güneşte tepeler uzun gölgeler bırakır; gün boyu başka görünür." },
    ],
    gorseller: ["Evde: duvarda", "Kum denizi: sık, paralel sırtlar", "Kıvrık sırtlar, pas rengi", "Tek tepe, kemik rengi", "Hilal tepeler, kum rengi"],
    animasyon: true,
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
    piyasaFiyati: 429,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kumdan yükselir", metin: "Gövde tabandan yukarı doğru bir yana eğilir; boğumlar halka halka belirir, pullu doku ışığı yakalar." },
      { baslik: "Dişler kalemi tutar", metin: "Ağzın dişleri içe doğru eğilir: kalemler, fırçalar ve makaslar dik durur, dışarı devrilmez." },
      { baslik: "Desteksiz, tek parça", metin: "Boğumların altı 45°'yi aşmaz, dişler 40°'den fazla eğilmez; kurt destek izi olmadan basılır." },
    ],
    gorseller: ["Evde: masanın üstünde", "Yaşlı kurt: derin boğumlar", "Yavru: kısa, küçük dişler", "Kurt saksı: geniş gövde", "Çöl kurdu: açık ağız, 18 diş"],
    animasyon: true,
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
    piyasaFiyati: 449,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kumun dokusu", metin: "Dalgalar gerçek kum dalgacıkları gibi asimetrik: bir yüzü yumuşak, öbürü dik; burgu onları gövde boyunca döndürür." },
      { baslik: "Kaseden vazoya", metin: "Profil, ağız çapı ve yükseklikle aynı araçtan meyve kasesi, anahtar tabağı ya da yüksek bir vazo çıkar." },
      { baslik: "Desteksiz açılır", metin: "Duvarın açılması 45°'yi geçmeyecek şekilde sınırlanır; istenen ağız çapı sığmazsa araç söyler." },
    ],
    gorseller: ["Evde: masanın üstünde", "Anahtar tabağı, dalgalı ağız", "Derin kase, okra", "Kum vazosu: yüksek, burgulu", "Meyve kasesi, kum rengi"],
    animasyon: true,
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
    piyasaFiyati: 229,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Tam ölçüde keser", metin: "Bıçak şeklin dışında durur: 75 mm seçtiyseniz kurabiye 75 mm çıkar." },
      { baslik: "Keskin, temiz kenar", metin: "Bıçağın son 3 mm'si incelir; hamur yırtılmadan, kenarları düzgün kesilir." },
      { baslik: "Parmağı korur", metin: "Geniş tutma kenarı bastırırken avucunuza oturur; deliğiyle kalıplar bir ipe dizilip asılır." },
    ],
    gorseller: ["Evde: masanın üstünde", "Kurabiye adam, yeşil", "Kardan adam, beyaz", "Kar tanesi, buz mavisi", "Yıldız, kırmızı"],
    animasyon: true,
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
    piyasaFiyati: 249,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Her misafire bir kart", metin: "İsimler Türkçe harfleriyle basılır; yazı kartın içine kendiliğinden sığar." },
      { baslik: "Üç renk", metin: "Kart, kabartma yazı ve ayak ayrı renkte: çam yeşiline altın, kırmızıya beyaz." },
      { baslik: "Sofradan sonra hatıra", metin: "Kart ayağından çıkar; misafiriniz evine götürür, ağaca ya da rafa koyar." },
    ],
    gorseller: ["Evde: masanın üstünde", "Yıldızlı: siyah ve altın", "Kar tanesi: beyaz ve buz mavisi", "Kırmızı çan", "Klasik: çam, el yazısı, altın"],
    animasyon: true,
    ciktilar: [
      { ad: "Kart STL", sec: "#sk-stl-kart", tur: "stl", nesne: "Kart" },
      { ad: "Yazı ve motif STL", sec: "#sk-stl-yazi", tur: "stl", nesne: "Kart" },
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
    piyasaFiyati: 649,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Işıkla beliren desen", metin: "Gündüz yalnızca hafif bir kabartma; mum LED yanınca çam ormanı, kar taneleri ya da yıldızlı gece ortaya çıkar." },
      { baslik: "Sizin geceniz", metin: "Desen numarası ve yoğunlukla her fener ayrı; ön yüzüne aile adı ya da kısa bir söz." },
      { baslik: "Mum LED'iyle birlikte", metin: "Fener pilli mum LED'in üstüne kapatılır; LED kutudan çıkar." },
    ],
    gorseller: ["Evde: masanın üstünde", "Kar yağışı: parlayan kar taneleri", "Yıldızlı gece, hilal ay", "İsimli: Mutlu Yıllar", "Çam ormanı, ışık yanınca"],
    animasyon: true,
    ciktilar: [
      { ad: "Fener STL", sec: "#yf-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Fener bilgisi (CSV)", sec: "#yf-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["yılbaşı feneri", "litofan fener", "led mumluk", "ışıklı yılbaşı süsü", "isimli fener", "yılbaşı dekorasyon"],
    etiketler: ["koleksiyon-yilbasi"],
  },
  // ---------------- OYUN ODASI, ÇÖL UFKU, ÇELENK (çok renkli, katmanlı) ----------------
  {
    id: "neon-sahil-tabela",
    ad: "Retro Gün Batımı İsimlik",
    ozet: "Adınız şeritli güneşin ve palmiyelerin önünde: dört renkli, masada duran isimlik.",
    aciklama:
      "Seksenlerin sahil şeridinden bir tabela: gün batımında doğan şeritli güneş, kenarlarda palmiyeler ve önünde el yazısıyla adınız. Oyun odasına, yayın masasına ya da kapıya; yazıyı ve alt satırı siz yazın, yazı tipini, güneşin şerit sayısını, palmiyelerin yerini ve neon çerçeveyi siz seçin. Zemin, güneş, palmiye ve yazı ayrı renkte, tek seferde basılır; renkler üst üste binmez, aralarında zemin renginde ince bir kontur kalır. Masada eğik ayağıyla durur ya da iki delikten duvara asılır.",
    ayarlar: ["Hazır tabela", "Yazı, alt satır ve yazı tipi", "Şeritli güneş ve palmiyeler", "Neon çerçeve", "Genişlik, yükseklik ve duruş (masa ayağı, duvar)", "Zemin, güneş, palmiye ve yazı rengi"],
    kategoriler: ["masa-ofis-standlar", "ofis-aksesuarlari", "koleksiyon-kisiye-ozel", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 69, sureSaat: 2.32 },
    sinir: { kutleG: [12, 200], sureSaat: [0.5, 7] },
    piyasaFiyati: 449,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Dört renk, tek baskı", metin: "Zemin, güneş, palmiye ve yazı ayrı filamentle aynı baskıda çıkar; boya ya da yapıştırma yok." },
      { baslik: "Yazı kendini sığdırır", metin: "Adınızı yazdıkça harfler tabelaya göre büyür ya da küçülür; Türkçe harfler olduğu gibi basılır." },
      { baslik: "Masada da duvarda da", metin: "Eğik yarıklı ayağına oturur, 12° geriye yaslanır; isterseniz iki vida deliğiyle duvara asılır." },
    ],
    gorseller: ["Evde: duvarda", "Neon gece: mor güneş, turkuaz palmiye", "Öğlen sahili: beyaz zemin, duvar delikli", "Yalnız yazı: çerçeve ve palmiyeler", "Gün batımı: turuncu güneş, pembe yazı"],
    animasyon: true,
    ciktilar: [
      { ad: "Zemin STL", sec: "#ns-stl-zemin", tur: "stl", nesne: "Tabela" },
      { ad: "Güneş STL", sec: "#ns-stl-gunes", tur: "stl", nesne: "Tabela" },
      { ad: "Palmiye STL", sec: "#ns-stl-palmiye", tur: "stl", nesne: "Tabela" },
      { ad: "Yazı ve çerçeve STL", sec: "#ns-stl-yazi", tur: "stl", nesne: "Tabela" },
      { ad: "Masa ayağı STL", sec: "#ns-stl-ayak", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Tabela bilgisi (CSV)", sec: "#ns-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["isimli masa tabelası", "oyun odası tabelası", "retro neon isimlik", "palmiyeli gün batımı tabela", "yayıncı masa isimliği", "çok renkli 3d baskı"],
    etiketler: ["koleksiyon-oyun-odasi", "koleksiyon-kisiye-ozel"],
  },
  {
    id: "kahraman-amblemi",
    ad: "Baş Harfli Kahraman Amblemi",
    ozet: "Baş harfinizle kurulan, patlama yıldızlı çizgi roman amblemi.",
    aciklama:
      "Kendi süper kahramanınızın amblemi: daire, kalkan, altıgen ya da elmas biçiminde; ortasında baş harfiniz, bir yıldırım ya da taç. Simgenin arkasında elle çizilmiş gibi düzensiz dişli bir patlama yıldızı, zeminde eski çizgi roman baskılarındaki gibi aşağı doğru büyüyen noktalar, kenarda kalın bir bordür durur. Üç renk tek seferde basılır; simge patlamanın, patlama noktaların üstünde kabarır ve aralarında mürekkep konturu gibi zemin rengi kalır. Küçük ölçüde anahtarlık ve çanta süsü, büyük ölçüde duvar ya da kapı amblemi.",
    ayarlar: ["Hazır amblem", "Biçim: daire, kalkan, altıgen, elmas", "Simge: baş harf, yıldırım ya da taç", "Patlama yıldızı, baskı noktaları ve bordür", "Genişlik ve askı halkası", "Zemin, bordür ve simge rengi"],
    kategoriler: ["koleksiyon-kisiye-ozel", "hediye", "dekor-duvar", "ev-dekorasyon"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 23, sureSaat: 0.96 },
    sinir: { kutleG: [4, 180], sureSaat: [0.3, 6] },
    piyasaFiyati: 299,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Amblem sizin", metin: "Baş harfiniz, biçiminiz, renkleriniz: hazır bir kahramanın değil, sizin kahramanınızın işareti." },
      { baslik: "Çizgi roman baskısı gibi", metin: "Düzensiz dişli patlama, aşağı doğru büyüyen noktalar ve renklerin arasında kalan kontur; kâğıttaki mürekkep hissi." },
      { baslik: "Üç renk, üç kat", metin: "Bordür, patlama ve simge ayrı yükseklikte kabarır; ışıkta gölgesiyle, elde dokusuyla seçilir." },
    ],
    gorseller: ["Evde: duvarda", "Baş harf: kalkan, lacivert ve gümüş", "Kral: altıgen, taç", "Gece bekçisi: elmas, siyah ve sarı", "Şimşek: daire, kırmızı ve sarı"],
    animasyon: true,
    ciktilar: [
      { ad: "Zemin STL", sec: "#ka-stl-zemin", tur: "stl", nesne: "Amblem" },
      { ad: "Bordür ve patlama STL", sec: "#ka-stl-ikinci", tur: "stl", nesne: "Amblem" },
      { ad: "Simge STL", sec: "#ka-stl-simge", tur: "stl", nesne: "Amblem" },
      RENKLI_PAKET,
      { ad: "Amblem bilgisi (CSV)", sec: "#ka-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["süper kahraman amblemi", "baş harfli amblem", "çizgi roman dekoru", "kişiye özel anahtarlık", "çocuk odası duvar süsü", "çok renkli 3d baskı"],
    etiketler: ["koleksiyon-oyun-odasi", "koleksiyon-kisiye-ozel"],
  },
  {
    id: "lav-catlagi-zar-tepsisi",
    ad: "Lav Çatlağı Zar Tepsisi",
    ozet: "Çatlak taş zemininden lav görünen, rün halkalı iki renkli zar tepsisi.",
    aciklama:
      "Masaüstü oyunlar için cehennem kapısından çıkma bir zar tepsisi: çatlamış taş zeminin altından lav parlar, ortada iki çemberin arasına dizili rünler ve üçgen bir mühür durur. Altıgen, sekizgen ya da daire biçimini, çapı ve duvar yüksekliğini, taşların sayısını ve çatlakların genişliğini siz belirleyin; desen numarası çatlak ağını baştan kurar, aynı numara hep aynı tepsiyi verir. Köşelerden basamaklı sivri taşlar yükselir. Lav ve taş ayrı renkte, tek seferde basılır: turuncu lav, asit yeşili ya da plazma mavisi.",
    ayarlar: ["Hazır tepsi", "Biçim: altıgen, sekizgen, daire", "Çap ve duvar yüksekliği", "Taş sayısı, çatlak genişliği ve desen numarası", "Rün halkası, merkez mühür ve köşe dişleri", "Taş ve lav rengi"],
    kategoriler: ["dekor-kase", "dekorasyon-kase-tepsi", "ev-dekorasyon", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 74, sureSaat: 2.32 },
    sinir: { kutleG: [28, 380], sureSaat: [1, 14] },
    piyasaFiyati: 449,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Çatlaklardan lav görünür", metin: "Taş katı boydan boya çatlaktır; altındaki lav katı ayrı renkte basılır ve her çatlaktan parlar." },
      { baslik: "Her tepsi başka", metin: "Doksan dokuz desen: çatlak ağı ve rünler numaraya göre kurulur, beğendiğinizi saklarsınız." },
      { baslik: "Zarlar içeride kalır", metin: "Duvar düz yükselir, zemin düzdür; zarlar yuvarlanır, masadan düşmez. Anahtar ve bozukluk tepsisi olarak da durur." },
    ],
    gorseller: ["Evde: masanın üstünde", "Volkan ağzı: daire, sık çatlak", "Plazma çekirdeği: sekizgen, mavi", "Asit kuyusu: yeşil, mühürsüz", "Cehennem kapısı: altıgen, rün halkası"],
    animasyon: true,
    ciktilar: [
      { ad: "Taş STL", sec: "#lt-stl-tas", tur: "stl", nesne: "Tepsi" },
      { ad: "Lav katı STL", sec: "#lt-stl-lav", tur: "stl", nesne: "Tepsi" },
      RENKLI_PAKET,
      { ad: "Tepsi bilgisi (CSV)", sec: "#lt-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["zar tepsisi", "frp zar tepsisi", "masaüstü oyun aksesuarı", "lav temalı tepsi", "rünlü zar tepsisi", "çok renkli 3d baskı"],
    etiketler: ["koleksiyon-oyun-odasi"],
  },
  {
    id: "col-ufku-pano",
    ad: "Çöl Ufku Katmanlı Pano",
    ozet: "Kat kat kum tepeleri ve gökte iki ay: dört renkli, katmanlı duvar panosu.",
    aciklama:
      "Uzak bir çöl gezegeninin ufku, kat kat kesilmiş kâğıt gibi: en arkada gök ve iki ay, önde her biri bir öncekinden biraz daha kabarık kum tepeleri. Kemer, dikdörtgen ya da daire biçimini, ölçüyü, kat sayısını ve tepelerin yüksekliğini siz belirleyin; desen numarası her seferinde başka bir çöl kurar. İsterseniz tepelerden birinin sırtına pelerinli, asalı küçük bir gezgin yerleşir. Gök, ay ve iki kum tonu ayrı renkte, tek seferde basılır; gün batımı, gece, baharat ve kemik paletleri hazır.",
    ayarlar: ["Hazır manzara", "Biçim: kemer, dikdörtgen, daire", "Genişlik, yükseklik, çerçeve ve askı", "Kat sayısı, tepe yüksekliği ve desen numarası", "Tek ay, iki ay ve çöl gezgini", "Dört renkli palet"],
    kategoriler: ["dekor-duvar", "ev-dekorasyon"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 105, sureSaat: 3.33 },
    sinir: { kutleG: [18, 700], sureSaat: [0.7, 24] },
    piyasaFiyati: 649,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kat kat derinlik", metin: "Her kum katı bir öncekinin önünde ve bir kat daha yüksek durur; yandan gelen ışıkta katlar birbirine gölge düşürür." },
      { baslik: "Dört renk, tek baskı", metin: "Gök, ay ve iki kum tonu ayrı filamentle aynı baskıda çıkar; boya yok, renk solmaz." },
      { baslik: "Kendi çölünüz", metin: "Doksan dokuz desen: aynı numara hep aynı ufku verir. İki ayı, gezgini ve paleti siz seçersiniz." },
    ],
    gorseller: ["Evde: duvarda", "Gece yürüyüşü: gezgin, lacivert gök", "Baharat vadisi: daire, turuncu ay", "Sessiz çöl: kemik tonları, çerçevesiz", "İki ay: kemer, gün batımı"],
    animasyon: true,
    ciktilar: [
      { ad: "Gök levhası STL", sec: "#cu-stl-gok", tur: "stl", nesne: "Pano" },
      { ad: "Aylar STL", sec: "#cu-stl-ay", tur: "stl", nesne: "Pano" },
      { ad: "Açık kum STL", sec: "#cu-stl-acik", tur: "stl", nesne: "Pano" },
      { ad: "Koyu kum ve çerçeve STL", sec: "#cu-stl-koyu", tur: "stl", nesne: "Pano" },
      RENKLI_PAKET,
      { ad: "Pano bilgisi (CSV)", sec: "#cu-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["katmanlı duvar panosu", "çöl manzarası pano", "iki aylı çöl", "dune dekor", "bilim kurgu duvar süsü", "çok renkli 3d baskı"],
    etiketler: ["koleksiyon-kum-tepesi"],
  },
  {
    id: "isimli-yilbasi-celengi",
    ad: "İsimli Yılbaşı Çelengi",
    ozet: "Ortasındaki şeride aile adınızı yazdığınız, kokinalı ve fiyonklu dört renkli çelenk.",
    aciklama:
      "Kapıya, duvara ya da ağacın tepesine isimli yılbaşı çelengi. Üst üste binen yapraklar halkayı doldurur, aralarında damarlı kabartma yapraklar ve kokina salkımları durur; altta ya da üstte bir fiyonk, ortada kırlangıç uçlu şeritte aile adınız ya da kısa bir dileğiniz. Çapı, yaprakların sıklığını, kokina salkımlarının sayısını ve fiyongun yerini siz belirleyin; yazı şeride kendiliğinden sığar, Türkçe harfler olduğu gibi basılır. Yaprak, kokina, şerit ve yazı ayrı renkte, tek seferde basılır. Şeritsiz seçerseniz yalın bir çelenk olur.",
    ayarlar: ["Hazır çelenk", "İsim şeridi ve yazı tipi", "Çap, yaprak sıklığı ve kokina salkımı", "Fiyonk: altta, üstte ya da yok", "Askı halkası", "Yaprak, kokina, şerit ve yazı rengi"],
    kategoriler: ["yilbasi-dekorasyon", "yilbasi-susler", "yilbasi", "hediye-yilbasi", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 43, sureSaat: 1.53 },
    sinir: { kutleG: [10, 140], sureSaat: [0.5, 5.5] },
    piyasaFiyati: 349,
    teslim: "Sipariş sonrası üretilir, 1–3 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Aile adınız ortasında", metin: "İsim şeridin içine kendiliğinden sığar; şerit çelengin iki yanına oturur, harfler şeridin üstünde kabarır." },
      { baslik: "Dört renk, tek baskı", metin: "Yaprak, kokina ve fiyonk, şerit ve yazı ayrı filamentle aynı baskıda çıkar." },
      { baslik: "Kat kat kabartma", metin: "Damarlı yapraklar tabanın, kubbe gibi kokinalar yaprakların üstünde durur; çelenk düz değil, dokuludur." },
    ],
    gorseller: ["Evde: duvarda", "Altın: koyu yeşil, Mutlu Yıllar", "Karlı: beyaz yaprak, lacivert kokina", "Yalnız çelenk: şeritsiz, fiyonk üstte", "Klasik: yeşil yaprak, kırmızı fiyonk"],
    animasyon: true,
    ciktilar: [
      { ad: "Taban ve yapraklar STL", sec: "#yc-stl-yaprak", tur: "stl", nesne: "Çelenk" },
      { ad: "Kokina ve fiyonk STL", sec: "#yc-stl-meyve", tur: "stl", nesne: "Çelenk" },
      { ad: "Şerit STL", sec: "#yc-stl-serit", tur: "stl", nesne: "Çelenk" },
      { ad: "Yazı STL", sec: "#yc-stl-yazi", tur: "stl", nesne: "Çelenk" },
      RENKLI_PAKET,
      { ad: "Çelenk bilgisi (CSV)", sec: "#yc-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["isimli yılbaşı çelengi", "kişiye özel kapı süsü", "yılbaşı kapı çelengi", "aile isimli çelenk", "yılbaşı hediyesi", "çok renkli 3d baskı"],
    etiketler: ["koleksiyon-yilbasi"],
  },
  {
    id: "foto-yapboz",
    ad: "Fotoğraflı Yapboz",
    ozet: "Kendi fotoğrafınızdan, gerçek geçmeli parçalı, çok renkli yapboz; çerçevesi ve ayağıyla.",
    aciklama:
      "Fotoğrafınızı yükleyin, yapboza dönüşsün. Fotoğraf iki, üç ya da dört filament rengine ayrılır; parçalar gerçek yapboz gibi birbirine geçer: her kenarda yönü ve duruşu farklı bir çıkıntı vardır, iki yapboz birbirinin aynısı olmaz. Biçimi (yatay, dikey, kare), uzun kenarı ve parça sayısını siz seçersiniz: 12 parçalık çocuk yapbozundan 100 parçalık portreye. Renkler baskının içindedir; boya, çıkartma ya da kâğıt yok, ıslanınca soyulmaz. Parçalar yuvalı çerçevesine dizilir; çerçevenin alt bandına bir isim ya da tarih yazabilir, kalp ya da yıldız kabartması ekleyebilirsiniz. İki ayağıyla rafta 15° yatık durur.",
    ayarlar: ["Kendi fotoğrafınız: yakınlaştırma ve kaydırma", "Biçim, uzun kenar ve parça sayısı", "2–4 filament rengi, renkli ya da siyah beyaz", "Kesim deseni", "Çerçeve: düz, kalpli, yıldızlı; alt bantta yazı", "Masa ayağı"],
    kategoriler: ["hediye", "koleksiyon-kisiye-ozel", "ev-dekorasyon", "masa-ofis-standlar"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 176, sureSaat: 5.4 },
    sinir: { kutleG: [25, 300], sureSaat: [0.8, 10] },
    piyasaFiyati: 749,
    dosyaGerekli: {
      giris: "fy-foto",
      uyari: "Yapboz fotoğrafınızla üretilecek. Sepete eklemeden önce kendi fotoğrafınızı yükleyin.",
    },
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Gerçek geçmeli parçalar", metin: "Her kenarda dar boyunlu, geniş başlı bir geçme: parçalar yerine oturur, yapboz kaldırınca dağılmaz." },
      { baslik: "Renk baskının içinde", metin: "Fotoğraf dört filamentle parçanın kendisine basılır; kâğıt, çıkartma ya da boya yok, yıpranmaz." },
      { baslik: "Çerçevesiyle sergilenir", metin: "Tamamlanan yapboz yuvalı çerçevesinde durur; alt bandına adınızı ya da tarihi yazarsınız." },
    ],
    gorseller: ["Evde: masanın üstünde", "Portre: 100 parça, siyah beyaz", "Şehir manzarası: 48 parça, ayaklı", "Mini: 16 parça, çerçevesiz", "Balonlar: 48 parça, kalpli çerçeve"],
    animasyon: true,
    ciktilar: [
      { ad: "Yapboz · renk 1 STL", sec: "#fy-stl-r1", tur: "stl", nesne: "Yapboz", tekRenk: true },
      { ad: "Yapboz · renk 2 STL", sec: "#fy-stl-r2", tur: "stl", nesne: "Yapboz", tekRenk: true },
      { ad: "Yapboz · renk 3 STL", sec: "#fy-stl-r3", tur: "stl", nesne: "Yapboz", tekRenk: true },
      { ad: "Yapboz · renk 4 STL", sec: "#fy-stl-r4", tur: "stl", nesne: "Yapboz", tekRenk: true },
      { ad: "Çerçeve STL", sec: "#fy-stl-cerceve", tur: "stl", nesne: "Çerçeve" },
      { ad: "Çerçeve yazısı STL", sec: "#fy-stl-cerceve-yazi", tur: "stl", nesne: "Çerçeve" },
      { ad: "Masa ayağı STL", sec: "#fy-stl-ayak", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Yapboz bilgisi (CSV)", sec: "#fy-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["fotoğraflı yapboz", "kişiye özel puzzle", "fotoğraftan yapboz", "isimli çerçeveli yapboz", "sevgiliye hediye yapboz", "çok renkli 3d baskı"],
    etiketler: ["koleksiyon-ani", "koleksiyon-kisiye-ozel"],
  },
  {
    id: "foto-duvar-panosu",
    ad: "Fotoğraflı Duvar Panosu",
    ozet: "Fotoğrafınızdan çok renkli basılan ince, hafif duvar panosu; istenirse iki ya da üç panelde.",
    aciklama:
      "Bir fotoğrafı duvara asılacak çok renkli bir panoya çevirin. Fotoğraf iki, üç ya da dört gerçek filament rengine ayrılır; öneriyi beğenmezseniz her rengi tek tek değiştirirsiniz. Pano yalnızca iki milimetre kalınlığındadır; arkasındaki kasnak onu düz tutar ve çentiğiyle tek bir çiviye asılır, pano duvarın biraz önünde durur. İsterseniz arkası düz basılır ve çift taraflı bantla, delik açmadan yapışır. Tablaya sığmayan genişlikte iki ya da üç panele bölünür ve fotoğraf panellerin üstünden kesintisiz geçer; 70 santime kadar üçlü pano kurabilirsiniz. Köşe yuvarlaklığını ve kenarlığı siz ayarlarsınız. Tek panelde iki küçük ayağıyla masada da durur.",
    ayarlar: ["Kendi fotoğrafınız: yakınlaştırma ve kaydırma", "Biçim: yatay, dikey, kare, geniş", "Toplam genişlik ve panel sayısı (1–3)", "2–4 filament rengi, renkli ya da siyah beyaz", "Köşe yuvarlaklığı ve kenarlık", "Duruş: çiviye asılan arka kasnak, bant ya da masa ayağı"],
    kategoriler: ["dekor-duvar", "ev-dekorasyon", "hediye", "koleksiyon-kisiye-ozel"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 82, sureSaat: 2.76 },
    sinir: { kutleG: [12, 700], sureSaat: [0.5, 22] },
    piyasaFiyati: 479,
    dosyaGerekli: {
      giris: "fp-foto",
      uyari: "Pano fotoğrafınızla üretilecek. Sepete eklemeden önce kendi fotoğrafınızı yükleyin.",
    },
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Kasnaklı, çiviye asılır", metin: "Arka kasnak panoyu burulmaya karşı düz tutar; üstündeki çentik çiviye oturur. Bantla, delik açmadan da yapışır." },
      { baslik: "Üç panele kadar", metin: "Geniş fotoğraflar iki ya da üç panele bölünür; görüntü panelden panele kesintisiz devam eder." },
      { baslik: "Gerçek filament renkleri", metin: "Ekranda gördüğünüz renk, makineye takılan filamentin rengidir; solmaz, soyulmaz." },
    ],
    gorseller: ["Evde: duvarda", "Üçlü pano: 45 cm, gün batımı", "Kare portre: siyah beyaz", "Masa panosu: dikey, ayaklı", "Balonlar: tek pano, kenarlıklı"],
    animasyon: true,
    ciktilar: [
      { ad: "Panel 1 · renk 1 STL", sec: "#fp-stl-p1-r1", tur: "stl", nesne: "Panel 1", tekRenk: true },
      { ad: "Panel 1 · renk 2 STL", sec: "#fp-stl-p1-r2", tur: "stl", nesne: "Panel 1", tekRenk: true },
      { ad: "Panel 1 · renk 3 STL", sec: "#fp-stl-p1-r3", tur: "stl", nesne: "Panel 1", tekRenk: true },
      { ad: "Panel 1 · renk 4 STL", sec: "#fp-stl-p1-r4", tur: "stl", nesne: "Panel 1", tekRenk: true },
      { ad: "Panel 2 · renk 1 STL", sec: "#fp-stl-p2-r1", tur: "stl", nesne: "Panel 2", tekRenk: true },
      { ad: "Panel 2 · renk 2 STL", sec: "#fp-stl-p2-r2", tur: "stl", nesne: "Panel 2", tekRenk: true },
      { ad: "Panel 2 · renk 3 STL", sec: "#fp-stl-p2-r3", tur: "stl", nesne: "Panel 2", tekRenk: true },
      { ad: "Panel 2 · renk 4 STL", sec: "#fp-stl-p2-r4", tur: "stl", nesne: "Panel 2", tekRenk: true },
      { ad: "Panel 3 · renk 1 STL", sec: "#fp-stl-p3-r1", tur: "stl", nesne: "Panel 3", tekRenk: true },
      { ad: "Panel 3 · renk 2 STL", sec: "#fp-stl-p3-r2", tur: "stl", nesne: "Panel 3", tekRenk: true },
      { ad: "Panel 3 · renk 3 STL", sec: "#fp-stl-p3-r3", tur: "stl", nesne: "Panel 3", tekRenk: true },
      { ad: "Panel 3 · renk 4 STL", sec: "#fp-stl-p3-r4", tur: "stl", nesne: "Panel 3", tekRenk: true },
      { ad: "Masa ayağı STL", sec: "#fp-stl-ayak", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Pano bilgisi (CSV)", sec: "#fp-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["fotoğraf duvar panosu", "kişiye özel duvar süsü", "fotoğraftan tablo", "üçlü pano", "çok renkli 3d baskı tablo", "hediye duvar dekoru"],
    etiketler: ["koleksiyon-ani", "koleksiyon-kisiye-ozel"],
  },
  {
    id: "foto-kutu",
    ad: "Fotoğraflı Hediye Kutusu",
    ozet: "Kapağı fotoğrafınızdan basılmış, bölmeli takı ve hatıra kutusu.",
    aciklama:
      "Kapağında fotoğrafınız olan bir kutu: takı, mektup, hatıra ya da hediyenin kendisi için. Fotoğraf kapağa dört filament rengiyle basılır ve seçtiğiniz renkte bir kenarlıkla çerçevelenir. Genişliği, derinliği ve yüksekliği siz belirlersiniz; iç ölçü modelin üstünde yazar. Kutu omuzludur: kapak gövdenin boynuna dıştan geçer ve dış yüzeyle aynı hizada kapanır, ne sallanır ne sıkışır. Duvarı yivli ya da düz seçersiniz; yivler duvara gömülüdür, kutunun dış ölçüsü değişmez. İçine iki, üç ya da dört gözlü bölme ekleyebilirsiniz. Kapak ve kutu, fotoğrafın renklerinden biriyle basılır; fazladan filament gerekmez.",
    ayarlar: ["Kendi fotoğrafınız: yakınlaştırma ve kaydırma", "Genişlik, derinlik, yükseklik", "Köşe yuvarlaklığı", "İç bölme: 2, 3 ya da 4 göz", "Yivli ya da düz duvar", "2–4 filament rengi ve fotoğraf kenarlığı", "Kapak ve kutu rengi"],
    kategoriler: ["hediye", "duzen-kutular", "koleksiyon-kisiye-ozel", "ev-dekorasyon"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 101, sureSaat: 3.31 },
    sinir: { kutleG: [30, 520], sureSaat: [1, 16] },
    piyasaFiyati: 649,
    dosyaGerekli: {
      giris: "fk-foto",
      uyari: "Kutu fotoğrafınızla üretilecek. Sepete eklemeden önce kendi fotoğrafınızı yükleyin.",
    },
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Fotoğraf kapağın kendisinde", metin: "Görüntü kapağa filamentle basılır; yapıştırma ya da kaplama yok, kenarından kalkmaz." },
      { baslik: "Omuzlu kapak", metin: "Kapak boynun üstüne geçer ve gövdeyle aynı hizada kapanır; açarken hafifçe direnir, kendiliğinden düşmez." },
      { baslik: "İçi sizin düzeninizde", metin: "İki, üç ya da dört göz: yüzük, küpe, kalem ya da kartlar ayrı durur." },
    ],
    gorseller: ["Evde: masanın üstünde", "Takı kutusu: kare, dört göz", "Uzun kutu: üç göz, düz duvar", "Klasik: siyah beyaz, geniş kenarlık", "Hatıra kutusu: çiçekli kapak, yivli duvar"],
    animasyon: true,
    ciktilar: [
      { ad: "Kapak · renk 1 STL", sec: "#fk-stl-kapak-r1", tur: "stl", nesne: "Kapak", tekRenk: true },
      { ad: "Kapak · renk 2 STL", sec: "#fk-stl-kapak-r2", tur: "stl", nesne: "Kapak", tekRenk: true },
      { ad: "Kapak · renk 3 STL", sec: "#fk-stl-kapak-r3", tur: "stl", nesne: "Kapak", tekRenk: true },
      { ad: "Kapak · renk 4 STL", sec: "#fk-stl-kapak-r4", tur: "stl", nesne: "Kapak", tekRenk: true },
      { ad: "Kutu gövdesi STL", sec: "#fk-stl-govde", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Kutu bilgisi (CSV)", sec: "#fk-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["fotoğraflı kutu", "kişiye özel hediye kutusu", "takı kutusu", "hatıra kutusu", "fotoğraflı takı kutusu", "çok renkli 3d baskı"],
    etiketler: ["koleksiyon-ani", "koleksiyon-kisiye-ozel"],
  },
  {
    id: "ses-dalgasi-plaketi",
    ad: "Ses Dalgası Plaketi",
    ozet: "Bir \"seni seviyorum\", bir kahkaha, bebeğin ilk kelimesi: sesinizin dalgası elde tutulan bir plakete dönüşür.",
    aciklama:
      "Birkaç saniyelik bir sesi elinizde tutabileceğiniz bir plakete çevirin: \"seni seviyorum\", bir kahkaha, bebeğinizin ilk kelimesi ya da şarkınızın nakaratı. Sesi tarayıcıda kaydedin ya da bir ses dosyası seçin; dalga anında plaketin üstünde belirir. Ses cihazınızdan çıkmaz, hiçbir yere gönderilmez: siparişe yalnız dalganın biçimi yazılır. Dalgayı çubuk, dolu dalga ya da halka olarak kurabilir, altına bir söz ya da tarih yazabilirsiniz. Zemin, dalga ve yazı ayrı renkte, tek seferde basılır. Masada eğik ayağıyla durur ya da iki delikten duvara asılır.",
    ayarlar: ["Ses kaydı ya da ses dosyası", "Dalga biçimi: çubuk, dolu dalga, halka", "Çubuk sayısı", "Yazı ve yazı tipi", "Genişlik, yükseklik ve duruş (masa ayağı, duvar)", "Zemin, dalga ve yazı rengi"],
    kategoriler: ["hediye", "koleksiyon-kisiye-ozel", "masa-ofis-standlar", "ev-dekorasyon"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 62, sureSaat: 2.06 },
    sinir: { kutleG: [20, 190], sureSaat: [0.7, 6.5] },
    piyasaFiyati: 449,
    teslim: "Sipariş sonrası üretilir, 2–4 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Dalga sizin sesiniz", metin: "Hazır bir desen değil: kaydınızın her hecesi çubukların boyunda okunur, iki plaket aynı olmaz." },
      { baslik: "Ses sizde kalır", metin: "Kayıt tarayıcınızda çözülür ve hiçbir yere yüklenmez; siparişe yalnız dalganın biçimi girer." },
      { baslik: "Üç renk, tek baskı", metin: "Zemin, dalga ve yazı ayrı filamentle aynı baskıda çıkar; kabartma elde hissedilir." },
    ],
    gorseller: ["Evde: duvarda", "İlk kelime: dolu dalga, turkuaz", "Ses halkası: kare, duvar", "Bizim şarkı: uzun, 90 çubuk", "Seni seviyorum: çubuk dalga, masa ayağı"],
    animasyon: true,
    ciktilar: [
      { ad: "Zemin STL", sec: "#sd-stl-zemin", tur: "stl", nesne: "Plaket" },
      { ad: "Dalga STL", sec: "#sd-stl-dalga", tur: "stl", nesne: "Plaket" },
      { ad: "Yazı STL", sec: "#sd-stl-yazi", tur: "stl", nesne: "Plaket" },
      { ad: "Masa ayağı STL", sec: "#sd-stl-ayak", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Plaket bilgisi (CSV)", sec: "#sd-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["ses dalgası plaketi", "ses kaydından hediye", "sevgiliye kişiye özel hediye", "bebek ilk kelime hatırası", "şarkı dalgası tablo", "çok renkli 3d baskı"],
    etiketler: ["koleksiyon-ani", "koleksiyon-kisiye-ozel"],
  },
  {
    id: "dalgali-vazo",
    ad: "Dalgalı Vazo",
    ozet: "Su tutan yivli vazo: dalgaların yönünü, yerini ve sıklığını siz seçersiniz.",
    aciklama:
      "Geniş bir karından ince bir boyna süzülen ve ağızda yeniden açılan, zambak soğanı biçiminde bir vazo. Gövdesini saran yivleri siz kurarsınız: dikey durabilir, sağa ya da sola burulabilir, yatay halkalara dönebilir; bütün gövdeyi sarabilir ya da yalnızca karında, boyunda ya da ağızda kalabilir. Dalga sayısını ve derinliğini, boyu ve en geniş çapı siz belirlersiniz; lilyum, lale ve sütun olmak üzere üç biçim vardır. Dalgalar içe doğrudur: seçtiğiniz çap değişmez. Yüzeyi pürüzsüz bırakabilir ya da mat, kumlu bir dokuyla pürüzlü seçebilirsiniz. Vazo su tutar: duvarı ve tabanı tam dolu basılır, canlı çiçek koyabilirsiniz. Ağız kenarı yuvarlatılmıştır; tek parça, desteksiz basılır.",
    ayarlar: ["Hazır vazo", "Biçim: lilyum, lale, sütun", "Boy ve en geniş çap", "Dalganın yönü: dikey, sağa burgu, sola burgu, yatay", "Dalganın yeri: bütün gövde, karın, boyun, ağız", "Dalga sayısı ve derinliği", "Renk", "Yüzey: pürüzsüz ya da pürüzlü"],
    kategoriler: ["vazo-saksi", "vazo-saksi-saksilar", "ev-dekorasyon", "hediye"],
    malzeme: "PLA",
    malzemeSabit: true,
    varsayilan: { kutleG: 196, sureSaat: 7.06 },
    sinir: { kutleG: [30, 380], sureSaat: [1.1, 14] },
    piyasaFiyati: 849,
    teslim: "Sipariş sonrası üretilir, 3–5 iş günü içinde kargoya verilir.",
    vurgular: [
      { baslik: "Dalgayı siz yönlendirin", metin: "Aynı vazo düz yivli, burgulu ya da halkalı olabilir; dalga gövdenin tamamında ya da yalnız bir bölümünde durur." },
      { baslik: "Su tutar", metin: "Duvar ve taban tam dolu basılır, katmanlar arasında boşluk kalmaz: canlı çiçek için su koyabilirsiniz." },
      { baslik: "Tek parça, desteksiz", metin: "Biçim, baskının taşıyabileceği eğimde kalacak şekilde kurulur; yüzeyde destek izi olmaz." },
    ],
    gorseller: ["Evde: masanın üstünde", "Burgulu: sağa dönen 16 yiv, hafif pürüzlü", "Halkalı lale: yatay dalga, adaçayı", "Yalın sütun: pürüzlü yüzey, antrasit", "Lilyum: Ø160 × 240 mm, 24 düz yiv"],
    animasyon: true,
    ciktilar: [
      { ad: "Vazo STL", sec: "#dv-stl", tur: "stl" },
      RENKLI_PAKET,
      { ad: "Vazo bilgisi (CSV)", sec: "#dv-csv", tur: "belge" },
    ],
    anahtarKelimeler: ["dalgalı vazo", "yivli vazo", "kişiye özel vazo", "burgulu vazo", "su geçirmez 3d baskı vazo", "dekoratif vazo"],
  },
];

/**
 * Öne çıkan ürünler, sırasıyla: listelerin başında durur, mağazada
 * "Öne çıkanlar" işaretini alır. İlki ızgaranın başındaki büyük kart.
 *
 * Seçim ölçütü: hediye olarak alınması kolay (kişiye özel, fotoğraflı,
 * isimli), fiyatı 200–600 ₺ bandında, sosyal medyada paylaşılınca kendini
 * anlatan ve özelleştirme animasyonu olan ürünler. Ses dalgası plaketi
 * başta: bir sesi elde tutulan bir nesneye çeviriyor, başka mağazada
 * benzeri yok ve aralık sezonunda (yılbaşı, yıl dönümü) en çok
 * aranan hediye türüne giriyor.
 */
export const ONE_CIKANLAR: string[] = [
  "ses-dalgasi-plaketi",
  "foto-kutu",
  "isimli-yilbasi-susu",
  "foto-yapboz",
  "neon-sahil-tabela",
  "dalgali-vazo",
  "isikli-yilbasi-feneri",
  "foto-duvar-panosu",
];

/** Izgaranın başında büyük duran ürün */
export const VITRIN_ARACI = ONE_CIKANLAR[0];

/**
 * Listeleme sırası: önce öne çıkanlar (yukarıdaki sırayla), sonra
 * özelleştirme animasyonu olanlar, en sonda diğerleri. Grup içinde
 * katalog sırası korunur.
 */
export function vitrinSirasi(araclar: TasarimAraci[]): TasarimAraci[] {
  const puan = (a: TasarimAraci) => {
    const i = ONE_CIKANLAR.indexOf(a.id);
    if (i >= 0) return i;
    return a.animasyon ? 100 : 200;
  };
  return araclar
    .map((a, i) => ({ a, i }))
    .sort((x, y) => puan(x.a) - puan(y.a) || x.i - y.i)
    .map(({ a }) => a);
}

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
 * aynı dosya ve ürünü bir ev ortamında gösterir (masada, duvarda);
 * sonrakiler "-2", "-3"… ekiyle durur ve boş stüdyoda çekilmiştir. Hepsi
 * aracın kurduğu modelin kendisinden, ışın izlemeyle çizildi
 * (scripts/urun-renderleri.py): her biri gerçekten üretilebilen bir
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

/** Özelleştirme animasyonunun adresi; araçta yoksa null */
export function aracAnimasyonu(arac: TasarimAraci): string | null {
  return arac.animasyon ? `/tasarim-araclari/_gorsel/${arac.id}.mp4` : null;
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
