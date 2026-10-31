// ==========================================
// MOBİLYA KATALOĞU — ODALAR VE ÜRÜN TİPLERİ
//
// Kategoriler ürüne göre değil ODAYA göre. İnsan "bana 180
// santim kitaplık lazım" diye düşünmüyor; "oturma odasına bir
// şey lazım" diye düşünüyor ve ürün tipini orada seçiyor.
//
// Ürünler burada tanımlı, veritabanında değil. Sebebi: bunlar
// satır değil üreteç. Bir kitaplığın "stoğu" yok; ölçüsü,
// sütunu ve gözleri var ve her kombinasyon ayrı bir ürün.
// Hepsini satır olarak tutmaya kalksak milyonlarca satır
// gerekirdi. Sepete giderken tek bir veritabanı ürünü
// kullanılır, yapılandırma onun üstünde taşınır.
//
// SINIRLAR GERÇEK. Raf açıklığı 90 santimi geçince 18 mm levha
// zamanla bel verir — o yüzden genişlik büyüdükçe en az sütun
// sayısı kendiliğinden artar. Müşteriye sarkacak bir raf
// satmıyoruz.
// ==========================================

import type { MobilyaYapilandirma } from "./types";

export interface Oda {
  id: string;
  ad: string;
  aciklama: string;
}

export const ODALAR: Oda[] = [
  {
    id: "oturma-odasi",
    ad: "Oturma Odası",
    aciklama: "Kitaplık, TV ünitesi ve vitrin",
  },
  {
    id: "calisma-odasi",
    ad: "Çalışma Odası",
    aciklama: "Ofis kitaplığı, duvar rafı ve dosya dolabı",
  },
  {
    id: "yatak-odasi",
    ad: "Yatak Odası",
    aciklama: "Komodin ve şifonyer",
  },
  {
    id: "antre",
    ad: "Antre",
    aciklama: "Ayakkabılık ve giriş dolabı",
  },
  {
    id: "dekoratif-raf",
    ad: "Dekoratif Raf",
    aciklama: "Duvara monte kutu raflar",
  },
];

export interface OlcuSiniri {
  min: number;
  max: number;
  adim: number;
}

export interface MobilyaModeli {
  id: string;
  slug: string;
  oda: string;
  ad: string;
  /** Mağaza kartında görünen tek cümle */
  ozet: string;
  /** Yapılandırıcıda başlıkta görünen açıklama */
  aciklama: string;
  genislik: OlcuSiniri;
  yukseklik: OlcuSiniri;
  derinlik: OlcuSiniri;
  sutun: { min: number; max: number };
  sira: { min: number; max: number };
  varsayilan: {
    genislik: number;
    yukseklik: number;
    derinlik: number;
    sutun: number;
    sira: number;
    taban: string;
    arkaPanel: boolean;
    gozler?: Record<string, "kapak" | "cekmece">;
  };
  /** Duvara asılan ürünlerde taban seçeneği sunulmaz */
  tabanSecilebilir: boolean;
  /** Bazı ürünlerde kapak/çekmece anlamsız (açık duvar rafı) */
  gozSecilebilir: boolean;
  /** Ürün tipine özel işçilik çarpanı */
  iscilikCarpani: number;
  /** Arama ve SEO için */
  anahtarKelimeler: string[];
}

export const MODELLER: MobilyaModeli[] = [
  {
    id: "moduler-kitaplik",
    slug: "moduler-kitaplik",
    oda: "oturma-odasi",
    ad: "Modüler Kitaplık",
    ozet: "Ölçüsünü, sütununu ve gözlerini siz belirliyorsunuz.",
    aciklama:
      "Duvarınızın boyuna göre kurulan açık kitaplık. İstediğiniz gözü kapaklı ya da çekmeceli yapabilirsiniz.",
    genislik: { min: 600, max: 3000, adim: 10 },
    yukseklik: { min: 800, max: 2400, adim: 10 },
    derinlik: { min: 220, max: 500, adim: 10 },
    sutun: { min: 1, max: 6 },
    sira: { min: 2, max: 7 },
    varsayilan: {
      genislik: 1800,
      yukseklik: 1920,
      derinlik: 350,
      sutun: 3,
      sira: 4,
      taban: "plastik",
      arkaPanel: true,
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1,
    anahtarKelimeler: ["kitaplık", "modüler kitaplık", "ölçüye özel kitaplık", "raf ünitesi"],
  },
  {
    id: "tv-unitesi",
    slug: "tv-unitesi",
    oda: "oturma-odasi",
    ad: "TV Ünitesi",
    ozet: "Alçak gövde, kablolar için açık arka.",
    aciklama:
      "Televizyonun altına giren alçak ünite. Gözleri çekmeceli yapıp kumanda ve kabloları içine alabilirsiniz.",
    genislik: { min: 800, max: 3000, adim: 10 },
    yukseklik: { min: 300, max: 700, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 2, max: 5 },
    sira: { min: 1, max: 3 },
    varsayilan: {
      genislik: 1600,
      yukseklik: 450,
      derinlik: 400,
      sutun: 3,
      sira: 1,
      taban: "baza",
      arkaPanel: false,
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1,
    anahtarKelimeler: ["tv ünitesi", "televizyon sehpası", "ölçüye özel tv ünitesi"],
  },
  {
    id: "vitrin",
    slug: "vitrin",
    oda: "oturma-odasi",
    ad: "Vitrin Dolabı",
    ozet: "Kapaklı gözlerle kapalı depolama.",
    aciklama:
      "Üstü açık raf, altı kapaklı dolap. Hangi gözün kapanacağını modelin üstüne tıklayarak seçiyorsunuz.",
    genislik: { min: 600, max: 2400, adim: 10 },
    yukseklik: { min: 1000, max: 2400, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 2, max: 5 },
    sira: { min: 3, max: 7 },
    varsayilan: {
      genislik: 1200,
      yukseklik: 1800,
      derinlik: 380,
      sutun: 2,
      sira: 5,
      taban: "baza",
      arkaPanel: true,
      gozler: { "0-0": "kapak", "1-0": "kapak", "0-1": "kapak", "1-1": "kapak" },
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1.05,
    anahtarKelimeler: ["vitrin", "kapaklı dolap", "ölçüye özel vitrin"],
  },
  {
    id: "ofis-kitapligi",
    slug: "ofis-kitapligi",
    oda: "calisma-odasi",
    ad: "Ofis Kitaplığı",
    ozet: "Klasör yüksekliğine göre ayarlanmış sıra aralığı.",
    aciklama:
      "Dosya klasörü sığacak derinlikte ve sıra yüksekliğinde kurulur. Alt gözleri kapatıp dağınıklığı gizleyebilirsiniz.",
    genislik: { min: 600, max: 2800, adim: 10 },
    yukseklik: { min: 1000, max: 2400, adim: 10 },
    derinlik: { min: 280, max: 450, adim: 10 },
    sutun: { min: 1, max: 5 },
    sira: { min: 3, max: 7 },
    varsayilan: {
      genislik: 1500,
      yukseklik: 2000,
      derinlik: 330,
      sutun: 3,
      sira: 5,
      taban: "plastik",
      arkaPanel: true,
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1,
    anahtarKelimeler: ["ofis kitaplığı", "dosya rafı", "klasör dolabı"],
  },
  {
    id: "calisma-rafi",
    slug: "calisma-rafi",
    oda: "calisma-odasi",
    ad: "Çalışma Rafı",
    ozet: "Masanın üstüne asılan sığ raf.",
    aciklama:
      "Duvara monte edilen açık raf. Masa üstünü boşaltmak için sığ tutulur; ayak ya da baza almaz.",
    genislik: { min: 400, max: 2000, adim: 10 },
    yukseklik: { min: 200, max: 900, adim: 10 },
    derinlik: { min: 150, max: 300, adim: 10 },
    sutun: { min: 1, max: 5 },
    sira: { min: 1, max: 4 },
    varsayilan: {
      genislik: 1000,
      yukseklik: 400,
      derinlik: 220,
      sutun: 3,
      sira: 2,
      taban: "plastik",
      arkaPanel: false,
    },
    tabanSecilebilir: false,
    gozSecilebilir: false,
    iscilikCarpani: 1,
    anahtarKelimeler: ["duvar rafı", "çalışma rafı", "masa üstü raf"],
  },
  {
    id: "dosya-dolabi",
    slug: "dosya-dolabi",
    oda: "calisma-odasi",
    ad: "Dosya Dolabı",
    ozet: "Çekmeceli, masa yüksekliğinde.",
    aciklama:
      "Masanın yanına giren alçak dolap. Gözleri çekmece yapıldığında teleskopik frenli rayla gelir.",
    genislik: { min: 350, max: 1200, adim: 10 },
    yukseklik: { min: 500, max: 900, adim: 10 },
    derinlik: { min: 350, max: 550, adim: 10 },
    sutun: { min: 1, max: 3 },
    sira: { min: 2, max: 4 },
    varsayilan: {
      genislik: 450,
      yukseklik: 650,
      derinlik: 450,
      sutun: 1,
      sira: 3,
      taban: "tekerlek",
      arkaPanel: true,
      gozler: { "0-0": "cekmece", "0-1": "cekmece", "0-2": "cekmece" },
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["dosya dolabı", "çekmeceli dolap", "keson"],
  },
  {
    id: "komodin",
    slug: "komodin",
    oda: "yatak-odasi",
    ad: "Komodin",
    ozet: "Yatak yüksekliğine göre ayarlanır.",
    aciklama:
      "Yatağınızın yüksekliğine göre ölçülendirin. Çekmeceli ya da açık gözlü yapabilirsiniz.",
    genislik: { min: 300, max: 800, adim: 10 },
    yukseklik: { min: 350, max: 800, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 1, max: 2 },
    sira: { min: 1, max: 4 },
    varsayilan: {
      genislik: 450,
      yukseklik: 550,
      derinlik: 400,
      sutun: 1,
      sira: 2,
      taban: "ayak",
      arkaPanel: true,
      gozler: { "0-0": "cekmece" },
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["komodin", "başucu dolabı", "ölçüye özel komodin"],
  },
  {
    id: "sifonyer",
    slug: "sifonyer",
    oda: "yatak-odasi",
    ad: "Şifonyer",
    ozet: "Sıra sıra çekmece, bel hizasında.",
    aciklama:
      "Katlanan giysi için çekmeceli gövde. Sıra sayısını artırdıkça çekmeceler alçalır.",
    genislik: { min: 600, max: 1800, adim: 10 },
    yukseklik: { min: 700, max: 1400, adim: 10 },
    derinlik: { min: 350, max: 550, adim: 10 },
    sutun: { min: 1, max: 3 },
    sira: { min: 3, max: 6 },
    varsayilan: {
      genislik: 900,
      yukseklik: 1000,
      derinlik: 450,
      sutun: 2,
      sira: 4,
      taban: "baza",
      arkaPanel: true,
      gozler: {
        "0-0": "cekmece", "1-0": "cekmece",
        "0-1": "cekmece", "1-1": "cekmece",
        "0-2": "cekmece", "1-2": "cekmece",
        "0-3": "cekmece", "1-3": "cekmece",
      },
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1.15,
    anahtarKelimeler: ["şifonyer", "çekmeceli dolap", "giysi dolabı"],
  },
  {
    id: "ayakkabilik",
    slug: "ayakkabilik",
    oda: "antre",
    ad: "Ayakkabılık",
    ozet: "Sığ gövde, kapaklı ya da açık.",
    aciklama:
      "Girişe sığacak derinlikte. Üstü oturma yüksekliğinde bırakılabilir, gözleri kapatılabilir.",
    genislik: { min: 500, max: 2000, adim: 10 },
    yukseklik: { min: 400, max: 1800, adim: 10 },
    derinlik: { min: 250, max: 400, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 2, max: 6 },
    varsayilan: {
      genislik: 900,
      yukseklik: 700,
      derinlik: 300,
      sutun: 2,
      sira: 3,
      taban: "ayak",
      arkaPanel: true,
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1,
    anahtarKelimeler: ["ayakkabılık", "antre dolabı", "ayakkabı rafı"],
  },
  {
    id: "antre-dolabi",
    slug: "antre-dolabi",
    oda: "antre",
    ad: "Antre Dolabı",
    ozet: "Boydan, kapaklı giriş dolabı.",
    aciklama:
      "Palto ve çantaya yer açan boy dolap. Üst gözleri açık bırakıp alt gözleri kapatmak en çok seçilen kurulum.",
    genislik: { min: 500, max: 2000, adim: 10 },
    yukseklik: { min: 1400, max: 2400, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 3, max: 7 },
    varsayilan: {
      genislik: 1000,
      yukseklik: 2000,
      derinlik: 380,
      sutun: 2,
      sira: 5,
      taban: "baza",
      arkaPanel: true,
      gozler: { "0-0": "kapak", "1-0": "kapak", "0-1": "kapak", "1-1": "kapak" },
    },
    tabanSecilebilir: true,
    gozSecilebilir: true,
    iscilikCarpani: 1.05,
    anahtarKelimeler: ["antre dolabı", "vestiyer", "boy dolap"],
  },
  {
    id: "kutu-raf",
    slug: "kutu-raf",
    oda: "dekoratif-raf",
    ad: "Kutu Raf",
    ozet: "Duvara asılan tek parça kare raf.",
    aciklama:
      "Tek ya da birkaç gözlü, duvara monte edilen sade raf. Gizli askı aparatıyla gelir.",
    genislik: { min: 250, max: 1200, adim: 10 },
    yukseklik: { min: 250, max: 900, adim: 10 },
    derinlik: { min: 150, max: 350, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 1, max: 3 },
    varsayilan: {
      genislik: 600,
      yukseklik: 350,
      derinlik: 250,
      sutun: 2,
      sira: 1,
      taban: "plastik",
      arkaPanel: true,
    },
    tabanSecilebilir: false,
    gozSecilebilir: false,
    iscilikCarpani: 1,
    anahtarKelimeler: ["kutu raf", "duvar rafı", "dekoratif raf"],
  },
  {
    id: "moduler-duvar-rafi",
    slug: "moduler-duvar-rafi",
    oda: "dekoratif-raf",
    ad: "Modüler Duvar Rafı",
    ozet: "Geniş, sığ ve gözleri eşit bölünmüş.",
    aciklama:
      "Duvarı boydan boya kaplayan sığ ızgara raf. Taşıyıcı duvara monte edilir, zeminle teması olmaz.",
    genislik: { min: 600, max: 2800, adim: 10 },
    yukseklik: { min: 300, max: 1400, adim: 10 },
    derinlik: { min: 150, max: 350, adim: 10 },
    sutun: { min: 2, max: 7 },
    sira: { min: 1, max: 5 },
    varsayilan: {
      genislik: 1600,
      yukseklik: 700,
      derinlik: 250,
      sutun: 4,
      sira: 2,
      taban: "plastik",
      arkaPanel: false,
    },
    tabanSecilebilir: false,
    gozSecilebilir: false,
    iscilikCarpani: 1,
    anahtarKelimeler: ["duvar rafı", "modüler raf", "ızgara raf"],
  },
];

export function modelBul(slug: string): MobilyaModeli | undefined {
  return MODELLER.find((m) => m.slug === slug);
}

export function odaBul(id: string): Oda | undefined {
  return ODALAR.find((o) => o.id === id);
}

export function odaModelleri(odaId: string): MobilyaModeli[] {
  return MODELLER.filter((m) => m.oda === odaId);
}

// ==========================================
// MONTAJ KURALLARI
//
// Bunlar hoşluk değil, mühendislik. 18 mm levha 90 santimden
// uzun açıklıkta zamanla bel verir; 25 santimden dar göz de
// kullanışsızdır. Bu yüzden genişlik büyüdükçe en az sütun
// sayısı artar, daraldıkça en çok sütun sayısı düşer.
//
// Kaydırıcıyı çekerken sütun sayısı kendiliğinden bu aralığa
// çekilir — müşteri sarkacak bir raf sipariş edemez.
// ==========================================

/** Bir gözün olabileceği en dar ve en geniş ölçü (mm) */
export const GOZ_GENISLIK = { min: 250, max: 900 };
/** Bir gözün olabileceği en alçak ve en yüksek ölçü (mm) */
export const GOZ_YUKSEKLIK = { min: 160, max: 700 };

const T = 18;

export function sutunSiniri(model: MobilyaModeli, genislik: number) {
  const ic = genislik - 2 * T;
  // n sütun için göz genişliği = (ic - (n-1)*T) / n
  const min = Math.max(
    model.sutun.min,
    Math.ceil((ic + T) / (GOZ_GENISLIK.max + T))
  );
  const max = Math.min(
    model.sutun.max,
    Math.max(min, Math.floor((ic + T) / (GOZ_GENISLIK.min + T)))
  );
  return { min, max: Math.max(min, max) };
}

export function siraSiniri(
  model: MobilyaModeli,
  yukseklik: number,
  tabanYuksekligi: number
) {
  const ic = yukseklik - tabanYuksekligi - 2 * T;
  const min = Math.max(
    model.sira.min,
    Math.ceil((ic + T) / (GOZ_YUKSEKLIK.max + T))
  );
  const max = Math.min(
    model.sira.max,
    Math.max(min, Math.floor((ic + T) / (GOZ_YUKSEKLIK.min + T)))
  );
  return { min, max: Math.max(min, max) };
}

export function varsayilanYapilandirma(
  model: MobilyaModeli
): MobilyaYapilandirma {
  return {
    modelId: model.id,
    genislik: model.varsayilan.genislik,
    yukseklik: model.varsayilan.yukseklik,
    derinlik: model.varsayilan.derinlik,
    sutun: model.varsayilan.sutun,
    sira: model.varsayilan.sira,
    gozler: { ...(model.varsayilan.gozler ?? {}) },
    govdeMalzeme: "acik-mese",
    onMalzeme: "acik-mese",
    taban: model.varsayilan.taban,
    kulp: "cubuk-siyah",
    arkaPanel: model.varsayilan.arkaPanel,
  };
}
