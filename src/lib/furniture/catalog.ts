// ==========================================
// MOBİLYA KATALOĞU — ODALAR VE ÜRÜN TİPLERİ
//
// Kategoriler ürüne göre değil ODAYA göre, Woodcoder'daki
// gibi. İnsan "bana 180 santim kitaplık lazım" diye
// başlamıyor; "oturma odasına bir şey lazım" diye başlıyor ve
// ürün tipini orada seçiyor. Bir ürün birden çok odada
// görünebilir — kitaplık hem oturma odasının hem ofisin işi.
//
// Ürünler burada tanımlı, veritabanında değil. Bunlar satır
// değil üreteç: bir kitaplığın stoğu yok, ölçüsü ve gözleri
// var ve her kombinasyon ayrı bir ürün olurdu.
//
// İki yapım ailesi var:
//   kutu → gövde, dikey bölmeler, raflar (dolap, kitaplık…)
//   masa → tabla ve onu taşıyan ayaklar (masa, sehpa, bank…)
// Üçüncüsü yok, çünkü üçüncü bir yapım biçimi yok.
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
  { id: "oturma-odasi", ad: "Oturma Odası", aciklama: "Kitaplık, TV ünitesi, vitrin ve sehpa" },
  { id: "yemek-odasi", ad: "Yemek Odası", aciklama: "Yemek masası, buffet, vitrin ve bank" },
  { id: "antre", ad: "Antre Mobilyası", aciklama: "Ayakkabılık, konsol, bank ve giriş dolabı" },
  { id: "yatak-odasi", ad: "Yatak Odası", aciklama: "Gardırop, komodin, şifonyer ve makyaj masası" },
  { id: "banyo", ad: "Banyo", aciklama: "Banyo dolabı, duvar dolabı ve makine dolabı" },
  { id: "mutfak", ad: "Mutfak", aciklama: "Alt dolap, duvar dolabı ve yüksek dolap" },
  { id: "genc-odasi", ad: "Genç Odası", aciklama: "Ders masası, kitaplık, gardırop ve komodin" },
  { id: "ofis", ad: "Ofis", aciklama: "Çalışma masası, kitaplık, dosya dolabı ve bölme" },
  { id: "dekoratif-raf", ad: "Dekoratif Raf", aciklama: "Duvara monte kutu ve ızgara raflar" },
  { id: "basit-sekiller", ad: "Basit Şekiller", aciklama: "Küp, dikdörtgen ve açık kutular" },
];

export interface OlcuSiniri {
  min: number;
  max: number;
  adim: number;
}

export type YapimAilesi = "kutu" | "masa";

export interface MobilyaModeli {
  id: string;
  slug: string;
  /** Bir ürün birden çok odada görünebilir */
  odalar: string[];
  tur: YapimAilesi;
  ad: string;
  ozet: string;
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
  tabanSecilebilir: boolean;
  gozSecilebilir: boolean;
  /** Masalarda sütun ve sıra yok; ızgara sekmesi gösterilmez */
  izgaraSecilebilir: boolean;
  iscilikCarpani: number;
  anahtarKelimeler: string[];
}

type Taslak = Omit<MobilyaModeli, "slug" | "tur" | "tabanSecilebilir" | "gozSecilebilir" | "izgaraSecilebilir" | "iscilikCarpani"> &
  Partial<Pick<MobilyaModeli, "slug" | "tur" | "tabanSecilebilir" | "gozSecilebilir" | "izgaraSecilebilir" | "iscilikCarpani">>;

/** Varsayılanları doldurur; her üründe aynı on satırı tekrarlamamak için */
function model(t: Taslak): MobilyaModeli {
  const tur = t.tur ?? "kutu";
  return {
    ...t,
    slug: t.slug ?? t.id,
    tur,
    tabanSecilebilir: t.tabanSecilebilir ?? true,
    gozSecilebilir: t.gozSecilebilir ?? tur === "kutu",
    izgaraSecilebilir: t.izgaraSecilebilir ?? tur === "kutu",
    iscilikCarpani: t.iscilikCarpani ?? 1,
  };
}

const dolaplar: MobilyaModeli[] = [
  model({
    id: "moduler-kitaplik",
    odalar: ["oturma-odasi", "genc-odasi", "ofis"],
    ad: "Kitaplık",
    ozet: "Ölçüsünü, sütununu ve gözlerini siz belirliyorsunuz.",
    aciklama: "Duvarınızın boyuna göre kurulan açık kitaplık. İstediğiniz gözü kapaklı ya da çekmeceli yapabilirsiniz.",
    genislik: { min: 600, max: 3000, adim: 10 },
    yukseklik: { min: 800, max: 2400, adim: 10 },
    derinlik: { min: 220, max: 500, adim: 10 },
    sutun: { min: 1, max: 6 },
    sira: { min: 2, max: 7 },
    varsayilan: { genislik: 1800, yukseklik: 1920, derinlik: 350, sutun: 3, sira: 4, taban: "plastik", arkaPanel: true },
    anahtarKelimeler: ["kitaplık", "modüler kitaplık", "ölçüye özel kitaplık", "raf ünitesi"],
  }),
  model({
    id: "duvara-monte-kitaplik",
    odalar: ["oturma-odasi", "genc-odasi", "ofis"],
    ad: "Duvara Monte Kitaplık",
    ozet: "Zemine değmez, duvarda asılı durur.",
    aciklama: "Taşıyıcı duvara monte edilen kitaplık. Altı boş kaldığı için oda daha ferah görünür; süpürge takılmaz.",
    genislik: { min: 600, max: 2400, adim: 10 },
    yukseklik: { min: 400, max: 1600, adim: 10 },
    derinlik: { min: 200, max: 400, adim: 10 },
    sutun: { min: 2, max: 6 },
    sira: { min: 1, max: 5 },
    varsayilan: { genislik: 1400, yukseklik: 900, derinlik: 280, sutun: 4, sira: 3, taban: "plastik", arkaPanel: true },
    tabanSecilebilir: false,
    anahtarKelimeler: ["duvara monte kitaplık", "asılı kitaplık", "duvar rafı"],
  }),
  model({
    id: "tv-unitesi",
    odalar: ["oturma-odasi"],
    ad: "TV Ünitesi",
    ozet: "Alçak gövde, kablolar için açık arka.",
    aciklama: "Televizyonun altına giren alçak ünite. Gözleri çekmeceli yapıp kumanda ve kabloları içine alabilirsiniz.",
    genislik: { min: 800, max: 3000, adim: 10 },
    yukseklik: { min: 300, max: 700, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 2, max: 5 },
    sira: { min: 1, max: 3 },
    varsayilan: { genislik: 1600, yukseklik: 450, derinlik: 400, sutun: 3, sira: 1, taban: "baza", arkaPanel: false },
    anahtarKelimeler: ["tv ünitesi", "televizyon sehpası", "ölçüye özel tv ünitesi"],
  }),
  model({
    id: "duvar-tv-unitesi",
    odalar: ["oturma-odasi"],
    ad: "Duvara Monte TV Ünitesi",
    ozet: "Asılı, zeminle teması yok.",
    aciklama: "Duvara monte edilen alçak ünite. Altı boş kaldığı için küçük odalarda daha hafif durur.",
    genislik: { min: 800, max: 2600, adim: 10 },
    yukseklik: { min: 250, max: 600, adim: 10 },
    derinlik: { min: 250, max: 450, adim: 10 },
    sutun: { min: 2, max: 5 },
    sira: { min: 1, max: 2 },
    varsayilan: { genislik: 1600, yukseklik: 350, derinlik: 350, sutun: 3, sira: 1, taban: "plastik", arkaPanel: false },
    tabanSecilebilir: false,
    anahtarKelimeler: ["duvara monte tv ünitesi", "asılı tv ünitesi"],
  }),
  model({
    id: "vitrin",
    odalar: ["oturma-odasi", "yemek-odasi", "genc-odasi", "ofis"],
    ad: "Vitrin Dolabı",
    ozet: "Kapaklı gözlerle kapalı depolama.",
    aciklama: "Üstü açık raf, altı kapaklı dolap. Hangi gözün kapanacağını modelin üstüne tıklayarak seçiyorsunuz.",
    genislik: { min: 600, max: 2400, adim: 10 },
    yukseklik: { min: 1000, max: 2400, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 2, max: 5 },
    sira: { min: 3, max: 7 },
    varsayilan: { genislik: 1200, yukseklik: 1800, derinlik: 380, sutun: 2, sira: 5, taban: "baza", arkaPanel: true, gozler: { "0-0": "kapak", "1-0": "kapak", "0-1": "kapak", "1-1": "kapak" } },
    iscilikCarpani: 1.05,
    anahtarKelimeler: ["vitrin", "kapaklı dolap", "ölçüye özel vitrin"],
  }),
  model({
    id: "duvara-monte-vitrin",
    odalar: ["oturma-odasi", "yemek-odasi", "ofis"],
    ad: "Duvara Monte Vitrin",
    ozet: "Kapaklı, asılı dolap.",
    aciklama: "Duvara monte edilen kapaklı dolap. Zeminde yer kaplamadan kapalı depolama verir.",
    genislik: { min: 500, max: 2000, adim: 10 },
    yukseklik: { min: 400, max: 1200, adim: 10 },
    derinlik: { min: 250, max: 400, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 1, max: 4 },
    varsayilan: { genislik: 1000, yukseklik: 700, derinlik: 320, sutun: 2, sira: 2, taban: "plastik", arkaPanel: true, gozler: { "0-0": "kapak", "1-0": "kapak", "0-1": "kapak", "1-1": "kapak" } },
    tabanSecilebilir: false,
    iscilikCarpani: 1.05,
    anahtarKelimeler: ["duvara monte vitrin", "asılı dolap", "duvar dolabı"],
  }),
  model({
    id: "buffet",
    odalar: ["yemek-odasi", "oturma-odasi", "antre"],
    ad: "Buffet",
    ozet: "Bel hizasında, kapaklı ve çekmeceli.",
    aciklama: "Yemek takımı ve örtü için alçak, geniş dolap. Üstü servis yüzeyi olarak kullanılır.",
    genislik: { min: 800, max: 2400, adim: 10 },
    yukseklik: { min: 700, max: 1100, adim: 10 },
    derinlik: { min: 350, max: 550, adim: 10 },
    sutun: { min: 2, max: 5 },
    sira: { min: 2, max: 4 },
    varsayilan: { genislik: 1600, yukseklik: 850, derinlik: 450, sutun: 3, sira: 2, taban: "baza", arkaPanel: true, gozler: { "0-0": "kapak", "1-0": "kapak", "2-0": "kapak", "0-1": "cekmece", "1-1": "cekmece", "2-1": "cekmece" } },
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["buffet", "yemek odası dolabı", "servis dolabı"],
  }),
  model({
    id: "gardirop",
    odalar: ["yatak-odasi", "genc-odasi", "ofis"],
    ad: "Gardırop",
    ozet: "Boydan, askılıklı ve raflı.",
    aciklama: "Boy dolap. Gözlerin hangisinin kapanacağını siz seçiyorsunuz; açık bıraktıklarınız raf olarak kalır.",
    genislik: { min: 600, max: 3000, adim: 10 },
    yukseklik: { min: 1600, max: 2600, adim: 10 },
    derinlik: { min: 450, max: 700, adim: 10 },
    sutun: { min: 1, max: 5 },
    sira: { min: 2, max: 6 },
    varsayilan: { genislik: 1800, yukseklik: 2200, derinlik: 560, sutun: 3, sira: 3, taban: "baza", arkaPanel: true, gozler: { "0-0": "kapak", "1-0": "kapak", "2-0": "kapak", "0-1": "kapak", "1-1": "kapak", "2-1": "kapak" } },
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["gardırop", "boy dolap", "ölçüye özel gardırop", "giysi dolabı"],
  }),
  model({
    id: "duvara-monte-gardirop",
    odalar: ["yatak-odasi", "ofis"],
    ad: "Duvara Monte Gardırop",
    ozet: "Asılı boy dolap, zemin boş kalır.",
    aciklama: "Taşıyıcı duvara monte edilen dolap. Altı boş kaldığı için zemin temizliği kolaylaşır.",
    genislik: { min: 600, max: 2400, adim: 10 },
    yukseklik: { min: 1000, max: 2000, adim: 10 },
    derinlik: { min: 400, max: 600, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 2, max: 5 },
    varsayilan: { genislik: 1400, yukseklik: 1500, derinlik: 500, sutun: 2, sira: 3, taban: "plastik", arkaPanel: true, gozler: { "0-0": "kapak", "1-0": "kapak", "0-1": "kapak", "1-1": "kapak" } },
    tabanSecilebilir: false,
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["duvara monte gardırop", "asılı dolap"],
  }),
  model({
    id: "komodin",
    odalar: ["yatak-odasi", "genc-odasi"],
    ad: "Komodin",
    ozet: "Yatak yüksekliğine göre ayarlanır.",
    aciklama: "Yatağınızın yüksekliğine göre ölçülendirin. Çekmeceli ya da açık gözlü yapabilirsiniz.",
    genislik: { min: 300, max: 800, adim: 10 },
    yukseklik: { min: 350, max: 800, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 1, max: 2 },
    sira: { min: 1, max: 4 },
    varsayilan: { genislik: 450, yukseklik: 550, derinlik: 400, sutun: 1, sira: 2, taban: "ayak", arkaPanel: true, gozler: { "0-0": "cekmece" } },
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["komodin", "başucu dolabı", "ölçüye özel komodin"],
  }),
  model({
    id: "sifonyer",
    odalar: ["yatak-odasi", "genc-odasi"],
    ad: "Şifonyer",
    ozet: "Sıra sıra çekmece, bel hizasında.",
    aciklama: "Katlanan giysi için çekmeceli gövde. Sıra sayısını artırdıkça çekmeceler alçalır.",
    genislik: { min: 600, max: 1800, adim: 10 },
    yukseklik: { min: 700, max: 1400, adim: 10 },
    derinlik: { min: 350, max: 550, adim: 10 },
    sutun: { min: 1, max: 3 },
    sira: { min: 3, max: 6 },
    varsayilan: { genislik: 900, yukseklik: 1000, derinlik: 450, sutun: 1, sira: 4, taban: "baza", arkaPanel: true, gozler: { "0-0": "cekmece", "0-1": "cekmece", "0-2": "cekmece", "0-3": "cekmece" } },
    iscilikCarpani: 1.15,
    anahtarKelimeler: ["şifonyer", "çekmeceli dolap", "giysi dolabı"],
  }),
  model({
    id: "ayakkabilik",
    odalar: ["antre"],
    ad: "Ayakkabılık",
    ozet: "Sığ gövde, kapaklı ya da açık.",
    aciklama: "Girişe sığacak derinlikte. Üstü oturma yüksekliğinde bırakılabilir, gözleri kapatılabilir.",
    genislik: { min: 500, max: 2000, adim: 10 },
    yukseklik: { min: 400, max: 1800, adim: 10 },
    derinlik: { min: 250, max: 400, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 2, max: 6 },
    varsayilan: { genislik: 900, yukseklik: 700, derinlik: 300, sutun: 2, sira: 3, taban: "ayak", arkaPanel: true },
    anahtarKelimeler: ["ayakkabılık", "antre dolabı", "ayakkabı rafı"],
  }),
  model({
    id: "duvara-monte-ayakkabilik",
    odalar: ["antre"],
    ad: "Duvara Monte Ayakkabılık",
    ozet: "Asılı ve sığ, zemin boş kalır.",
    aciklama: "Dar antrelerde zemini boş bırakır. Taşıyıcı duvara monte edilir.",
    genislik: { min: 500, max: 1600, adim: 10 },
    yukseklik: { min: 300, max: 900, adim: 10 },
    derinlik: { min: 200, max: 350, adim: 10 },
    sutun: { min: 1, max: 3 },
    sira: { min: 1, max: 4 },
    varsayilan: { genislik: 900, yukseklik: 500, derinlik: 280, sutun: 2, sira: 2, taban: "plastik", arkaPanel: true },
    tabanSecilebilir: false,
    anahtarKelimeler: ["duvara monte ayakkabılık", "asılı ayakkabılık"],
  }),
  model({
    id: "antre-dolabi",
    odalar: ["antre"],
    ad: "Antre Dolabı",
    ozet: "Boydan, kapaklı giriş dolabı.",
    aciklama: "Palto ve çantaya yer açan boy dolap. Üst gözleri açık bırakıp alt gözleri kapatmak en çok seçilen kurulum.",
    genislik: { min: 500, max: 2000, adim: 10 },
    yukseklik: { min: 1400, max: 2400, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 3, max: 7 },
    varsayilan: { genislik: 1000, yukseklik: 2000, derinlik: 380, sutun: 2, sira: 5, taban: "baza", arkaPanel: true, gozler: { "0-0": "kapak", "1-0": "kapak", "0-1": "kapak", "1-1": "kapak" } },
    iscilikCarpani: 1.05,
    anahtarKelimeler: ["antre dolabı", "vestiyer", "boy dolap"],
  }),
  model({
    id: "banyo-dolabi",
    odalar: ["banyo"],
    ad: "Banyo Dolabı",
    ozet: "Lavabo altına giren alçak dolap.",
    aciklama: "Nemli ortam için kenarları tam bantlanır. Lavabo altına girecek ölçüde kurulur.",
    genislik: { min: 400, max: 1600, adim: 10 },
    yukseklik: { min: 400, max: 900, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 1, max: 3 },
    sira: { min: 1, max: 3 },
    varsayilan: { genislik: 800, yukseklik: 600, derinlik: 400, sutun: 2, sira: 1, taban: "ayak", arkaPanel: true, gozler: { "0-0": "kapak", "1-0": "kapak" } },
    iscilikCarpani: 1.05,
    anahtarKelimeler: ["banyo dolabı", "lavabo altı dolap"],
  }),
  model({
    id: "banyo-duvar-dolabi",
    odalar: ["banyo"],
    ad: "Banyo Duvar Dolabı",
    ozet: "Asılı, sığ ve kapaklı.",
    aciklama: "Aynanın yanına ya da klozetin üstüne giren sığ dolap. Duvara monte edilir.",
    genislik: { min: 300, max: 1200, adim: 10 },
    yukseklik: { min: 300, max: 900, adim: 10 },
    derinlik: { min: 150, max: 300, adim: 10 },
    sutun: { min: 1, max: 3 },
    sira: { min: 1, max: 3 },
    varsayilan: { genislik: 600, yukseklik: 600, derinlik: 200, sutun: 1, sira: 2, taban: "plastik", arkaPanel: true, gozler: { "0-0": "kapak", "0-1": "kapak" } },
    tabanSecilebilir: false,
    anahtarKelimeler: ["banyo duvar dolabı", "asılı banyo dolabı"],
  }),
  model({
    id: "camasir-makinesi-dolabi",
    odalar: ["banyo", "mutfak"],
    ad: "Çamaşır Makinesi Dolabı",
    ozet: "Makineyi içine alır, üstü raf olur.",
    aciklama: "Çamaşır makinesinin ölçüsüne göre kurulur; üstünde kalan boşluk raf ya da kapaklı göz olur.",
    genislik: { min: 600, max: 1200, adim: 10 },
    yukseklik: { min: 1400, max: 2400, adim: 10 },
    derinlik: { min: 550, max: 700, adim: 10 },
    sutun: { min: 1, max: 2 },
    sira: { min: 2, max: 4 },
    varsayilan: { genislik: 700, yukseklik: 1900, derinlik: 620, sutun: 1, sira: 3, taban: "baza", arkaPanel: false, gozler: { "0-1": "kapak", "0-2": "kapak" } },
    iscilikCarpani: 1.05,
    anahtarKelimeler: ["çamaşır makinesi dolabı", "makine dolabı"],
  }),
  model({
    id: "mutfak-alt-dolabi",
    odalar: ["mutfak"],
    ad: "Mutfak Alt Dolabı",
    ozet: "Tezgâh altı, standart 85 cm yükseklikte.",
    aciklama: "Tezgâhın altına giren gövde. Gözleri kapaklı ya da çekmeceli yapabilirsiniz; tezgâh ayrıca ölçülür.",
    genislik: { min: 300, max: 3000, adim: 10 },
    yukseklik: { min: 700, max: 950, adim: 10 },
    derinlik: { min: 500, max: 650, adim: 10 },
    sutun: { min: 1, max: 6 },
    sira: { min: 1, max: 4 },
    varsayilan: { genislik: 1800, yukseklik: 850, derinlik: 580, sutun: 3, sira: 1, taban: "baza", arkaPanel: false, gozler: { "0-0": "kapak", "1-0": "cekmece", "2-0": "kapak" } },
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["mutfak alt dolabı", "tezgah altı dolap", "mutfak dolabı"],
  }),
  model({
    id: "mutfak-duvar-dolabi",
    odalar: ["mutfak"],
    ad: "Mutfak Duvar Dolabı",
    ozet: "Tezgâhın üstünde, asılı.",
    aciklama: "Tezgâh ile üst sınır arasına giren asılı dolap. Derinliği bilerek sığ: kafanızı çarpmayın.",
    genislik: { min: 300, max: 3000, adim: 10 },
    yukseklik: { min: 400, max: 1000, adim: 10 },
    derinlik: { min: 280, max: 400, adim: 10 },
    sutun: { min: 1, max: 6 },
    sira: { min: 1, max: 3 },
    varsayilan: { genislik: 1800, yukseklik: 700, derinlik: 320, sutun: 3, sira: 1, taban: "plastik", arkaPanel: true, gozler: { "0-0": "kapak", "1-0": "kapak", "2-0": "kapak" } },
    tabanSecilebilir: false,
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["mutfak duvar dolabı", "üst dolap", "asılı mutfak dolabı"],
  }),
  model({
    id: "mutfak-yuksek-dolabi",
    odalar: ["mutfak"],
    ad: "Mutfak Yüksek Dolabı",
    ozet: "Boydan kiler dolabı.",
    aciklama: "Kiler ve ankastre için boy dolap. Raflar arası yükseklik sıra sayısıyla belirleniyor.",
    genislik: { min: 400, max: 1400, adim: 10 },
    yukseklik: { min: 1600, max: 2600, adim: 10 },
    derinlik: { min: 500, max: 650, adim: 10 },
    sutun: { min: 1, max: 3 },
    sira: { min: 3, max: 6 },
    varsayilan: { genislik: 600, yukseklik: 2200, derinlik: 580, sutun: 1, sira: 4, taban: "baza", arkaPanel: true, gozler: { "0-0": "kapak", "0-1": "kapak", "0-2": "kapak", "0-3": "kapak" } },
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["mutfak yüksek dolabı", "kiler dolabı", "boy mutfak dolabı"],
  }),
  model({
    id: "dosya-dolabi",
    odalar: ["ofis"],
    ad: "Dosya Dolabı",
    ozet: "Çekmeceli, masa yüksekliğinde.",
    aciklama: "Masanın yanına giren alçak dolap. Gözleri çekmece yapıldığında teleskopik frenli rayla gelir.",
    genislik: { min: 350, max: 1200, adim: 10 },
    yukseklik: { min: 500, max: 900, adim: 10 },
    derinlik: { min: 350, max: 550, adim: 10 },
    sutun: { min: 1, max: 3 },
    sira: { min: 2, max: 4 },
    varsayilan: { genislik: 450, yukseklik: 650, derinlik: 450, sutun: 1, sira: 3, taban: "tekerlek", arkaPanel: true, gozler: { "0-0": "cekmece", "0-1": "cekmece", "0-2": "cekmece" } },
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["dosya dolabı", "çekmeceli dolap", "keson"],
  }),
  model({
    id: "ofis-kitapligi",
    odalar: ["ofis"],
    ad: "Ofis Kitaplığı",
    ozet: "Klasör yüksekliğine göre ayarlanmış sıra aralığı.",
    aciklama: "Dosya klasörü sığacak derinlikte ve sıra yüksekliğinde kurulur. Alt gözleri kapatıp dağınıklığı gizleyebilirsiniz.",
    genislik: { min: 600, max: 2800, adim: 10 },
    yukseklik: { min: 1000, max: 2400, adim: 10 },
    derinlik: { min: 280, max: 450, adim: 10 },
    sutun: { min: 1, max: 5 },
    sira: { min: 3, max: 7 },
    varsayilan: { genislik: 1500, yukseklik: 2000, derinlik: 330, sutun: 3, sira: 5, taban: "plastik", arkaPanel: true },
    anahtarKelimeler: ["ofis kitaplığı", "dosya rafı", "klasör dolabı"],
  }),
  model({
    id: "bolme-dolap",
    odalar: ["ofis", "oturma-odasi"],
    ad: "Bölme Dolap",
    ozet: "İki tarafı da açık, odayı ayırır.",
    aciklama: "Odanın ortasında durur ve iki taraftan da kullanılır. Arka paneli yoktur; bölme görevi görür.",
    genislik: { min: 600, max: 2400, adim: 10 },
    yukseklik: { min: 900, max: 1800, adim: 10 },
    derinlik: { min: 300, max: 450, adim: 10 },
    sutun: { min: 2, max: 5 },
    sira: { min: 2, max: 5 },
    varsayilan: { genislik: 1600, yukseklik: 1400, derinlik: 350, sutun: 4, sira: 3, taban: "plastik", arkaPanel: false },
    anahtarKelimeler: ["bölme dolap", "oda bölücü", "çift taraflı raf"],
  }),
  model({
    id: "calisma-rafi",
    odalar: ["ofis", "genc-odasi", "dekoratif-raf"],
    ad: "Çalışma Rafı",
    ozet: "Masanın üstüne asılan sığ raf.",
    aciklama: "Duvara monte edilen açık raf. Masa üstünü boşaltmak için sığ tutulur.",
    genislik: { min: 400, max: 2000, adim: 10 },
    yukseklik: { min: 200, max: 900, adim: 10 },
    derinlik: { min: 150, max: 300, adim: 10 },
    sutun: { min: 1, max: 5 },
    sira: { min: 1, max: 4 },
    varsayilan: { genislik: 1000, yukseklik: 400, derinlik: 220, sutun: 3, sira: 2, taban: "plastik", arkaPanel: false },
    tabanSecilebilir: false,
    gozSecilebilir: false,
    anahtarKelimeler: ["duvar rafı", "çalışma rafı", "masa üstü raf"],
  }),
  model({
    id: "kutu-raf",
    odalar: ["dekoratif-raf", "basit-sekiller"],
    ad: "Kutu Raf",
    ozet: "Duvara asılan tek parça kare raf.",
    aciklama: "Tek ya da birkaç gözlü, duvara monte edilen sade raf. Gizli askı aparatıyla gelir.",
    genislik: { min: 250, max: 1200, adim: 10 },
    yukseklik: { min: 250, max: 900, adim: 10 },
    derinlik: { min: 150, max: 350, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 1, max: 3 },
    varsayilan: { genislik: 600, yukseklik: 350, derinlik: 250, sutun: 2, sira: 1, taban: "plastik", arkaPanel: true },
    tabanSecilebilir: false,
    gozSecilebilir: false,
    anahtarKelimeler: ["kutu raf", "duvar rafı", "dekoratif raf"],
  }),
  model({
    id: "moduler-duvar-rafi",
    odalar: ["dekoratif-raf"],
    ad: "Modüler Duvar Rafı",
    ozet: "Geniş, sığ ve gözleri eşit bölünmüş.",
    aciklama: "Duvarı boydan boya kaplayan sığ ızgara raf. Taşıyıcı duvara monte edilir, zeminle teması olmaz.",
    genislik: { min: 600, max: 2800, adim: 10 },
    yukseklik: { min: 300, max: 1400, adim: 10 },
    derinlik: { min: 150, max: 350, adim: 10 },
    sutun: { min: 2, max: 7 },
    sira: { min: 1, max: 5 },
    varsayilan: { genislik: 1600, yukseklik: 700, derinlik: 250, sutun: 4, sira: 2, taban: "plastik", arkaPanel: false },
    tabanSecilebilir: false,
    gozSecilebilir: false,
    anahtarKelimeler: ["duvar rafı", "modüler raf", "ızgara raf"],
  }),
  model({
    id: "kup",
    odalar: ["basit-sekiller", "dekoratif-raf"],
    ad: "Küp",
    ozet: "Tek gözlü kare kutu.",
    aciklama: "En sade hâli: tek gözlü bir kutu. Yere konur, üst üste dizilir ya da duvara asılır.",
    genislik: { min: 250, max: 600, adim: 10 },
    yukseklik: { min: 250, max: 600, adim: 10 },
    derinlik: { min: 200, max: 500, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 1 },
    varsayilan: { genislik: 400, yukseklik: 400, derinlik: 350, sutun: 1, sira: 1, taban: "plastik", arkaPanel: true },
    anahtarKelimeler: ["küp raf", "kutu", "modüler küp"],
  }),
  model({
    id: "dikdortgen-kutu",
    odalar: ["basit-sekiller"],
    ad: "Dikdörtgen",
    ozet: "Boyu ve eni serbest açık kutu.",
    aciklama: "Bölmesiz, düz bir kutu. Nereye ne lazımsa o ölçüde kurulur.",
    genislik: { min: 300, max: 2000, adim: 10 },
    yukseklik: { min: 200, max: 1200, adim: 10 },
    derinlik: { min: 200, max: 600, adim: 10 },
    sutun: { min: 1, max: 4 },
    sira: { min: 1, max: 3 },
    varsayilan: { genislik: 900, yukseklik: 450, derinlik: 350, sutun: 2, sira: 1, taban: "plastik", arkaPanel: true },
    anahtarKelimeler: ["dikdörtgen kutu", "açık raf", "modüler kutu"],
  }),
];

const masalar: MobilyaModeli[] = [
  model({
    id: "yemek-masasi",
    odalar: ["yemek-odasi"],
    tur: "masa",
    ad: "Yemek Masası",
    ozet: "Kaç kişilikse o ölçüde.",
    aciklama: "Tabla ve onu taşıyan ayaklar. Kayıt tablanın bel vermesini engeller; ayak tipini siz seçiyorsunuz.",
    genislik: { min: 800, max: 2800, adim: 10 },
    yukseklik: { min: 700, max: 800, adim: 10 },
    derinlik: { min: 600, max: 1100, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 1 },
    varsayilan: { genislik: 1800, yukseklik: 750, derinlik: 900, sutun: 1, sira: 1, taban: "ahsap-ayak", arkaPanel: false },
    iscilikCarpani: 1.05,
    anahtarKelimeler: ["yemek masası", "ölçüye özel masa", "ahşap yemek masası"],
  }),
  model({
    id: "calisma-masasi",
    odalar: ["ofis", "genc-odasi"],
    tur: "masa",
    ad: "Çalışma Masası",
    ozet: "Odanın boşluğuna göre ölçülenir.",
    aciklama: "Tek kişilik çalışma masası. Alt raf eklerseniz kasa ve kutular için yer açılır.",
    genislik: { min: 800, max: 2200, adim: 10 },
    yukseklik: { min: 700, max: 800, adim: 10 },
    derinlik: { min: 500, max: 800, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 2 },
    varsayilan: { genislik: 1400, yukseklik: 750, derinlik: 650, sutun: 1, sira: 1, taban: "panel-ayak", arkaPanel: false },
    anahtarKelimeler: ["çalışma masası", "ofis masası", "ölçüye özel masa"],
  }),
  model({
    id: "ders-masasi",
    odalar: ["genc-odasi"],
    tur: "masa",
    ad: "Ders Masası",
    ozet: "Alt rafıyla birlikte, küçük odalara.",
    aciklama: "Genç odası için kompakt masa. Alt raf kitap ve kutulara yer açar.",
    genislik: { min: 700, max: 1600, adim: 10 },
    yukseklik: { min: 680, max: 780, adim: 10 },
    derinlik: { min: 450, max: 700, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 2 },
    varsayilan: { genislik: 1100, yukseklik: 740, derinlik: 550, sutun: 1, sira: 2, taban: "panel-ayak", arkaPanel: false },
    anahtarKelimeler: ["ders masası", "öğrenci masası", "genç odası masası"],
  }),
  model({
    id: "toplanti-masasi",
    odalar: ["ofis"],
    tur: "masa",
    ad: "Toplantı Masası",
    ozet: "Uzun tabla, sağlam kayıt.",
    aciklama: "Toplantı odasının boyuna göre kurulur. Uzun tablada kayıt daha da önemli: altında çöken bir masa olmaz.",
    genislik: { min: 1400, max: 3000, adim: 10 },
    yukseklik: { min: 720, max: 780, adim: 10 },
    derinlik: { min: 800, max: 1400, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 1 },
    varsayilan: { genislik: 2400, yukseklik: 750, derinlik: 1100, sutun: 1, sira: 1, taban: "metal-ayak", arkaPanel: false },
    iscilikCarpani: 1.1,
    anahtarKelimeler: ["toplantı masası", "ofis toplantı masası"],
  }),
  model({
    id: "sehpa",
    odalar: ["oturma-odasi"],
    tur: "masa",
    ad: "Sehpa",
    ozet: "Koltuğun önüne, alçak.",
    aciklama: "Oturma grubunun önüne giren alçak sehpa. Alt raf eklenebilir.",
    genislik: { min: 500, max: 1600, adim: 10 },
    yukseklik: { min: 300, max: 550, adim: 10 },
    derinlik: { min: 400, max: 900, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 2 },
    varsayilan: { genislik: 1100, yukseklik: 400, derinlik: 600, sutun: 1, sira: 2, taban: "ahsap-ayak", arkaPanel: false },
    anahtarKelimeler: ["sehpa", "orta sehpa", "ölçüye özel sehpa"],
  }),
  model({
    id: "yan-sehpa",
    odalar: ["oturma-odasi"],
    tur: "masa",
    ad: "Yan Sehpa",
    ozet: "Koltuğun yanına, dar.",
    aciklama: "Koltuğun kolunun yanına giren küçük sehpa. Yüksekliği koltuk koluna göre ayarlanır.",
    genislik: { min: 300, max: 700, adim: 10 },
    yukseklik: { min: 400, max: 700, adim: 10 },
    derinlik: { min: 300, max: 700, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 2 },
    varsayilan: { genislik: 450, yukseklik: 550, derinlik: 450, sutun: 1, sira: 1, taban: "ahsap-ayak", arkaPanel: false },
    anahtarKelimeler: ["yan sehpa", "köşe sehpa", "küçük sehpa"],
  }),
  model({
    id: "konsol",
    odalar: ["antre", "oturma-odasi"],
    tur: "masa",
    ad: "Konsol",
    ozet: "Dar ve uzun, duvar dibine.",
    aciklama: "Antre ya da koltuk arkasına giren dar masa. Derinliği bilerek az: geçişi daraltmaz.",
    genislik: { min: 600, max: 2000, adim: 10 },
    yukseklik: { min: 700, max: 950, adim: 10 },
    derinlik: { min: 250, max: 450, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 2 },
    varsayilan: { genislik: 1200, yukseklik: 800, derinlik: 350, sutun: 1, sira: 2, taban: "panel-ayak", arkaPanel: false },
    anahtarKelimeler: ["konsol", "antre konsolu", "dresuar"],
  }),
  model({
    id: "oturma-banki",
    odalar: ["antre", "yemek-odasi", "yatak-odasi"],
    tur: "masa",
    ad: "Oturma Bankı",
    ozet: "Oturma yüksekliğinde, alt rafı seçmeli.",
    aciklama: "Girişte ayakkabı giymek, yemek masasının yanına geçmek için. Alt raf eklerseniz altı depolamaya döner.",
    genislik: { min: 600, max: 2000, adim: 10 },
    yukseklik: { min: 380, max: 520, adim: 10 },
    derinlik: { min: 300, max: 500, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 2 },
    varsayilan: { genislik: 1100, yukseklik: 450, derinlik: 380, sutun: 1, sira: 2, taban: "panel-ayak", arkaPanel: false },
    anahtarKelimeler: ["oturma bankı", "antre bankı", "puf bank"],
  }),
  model({
    id: "makyaj-masasi",
    odalar: ["yatak-odasi", "genc-odasi"],
    tur: "masa",
    ad: "Makyaj Masası",
    ozet: "Dar tabla, alt raflı.",
    aciklama: "Yatak odasına giren dar masa. Ayna ayrıca alınır; tabla ölçüsü aynanın altına göre ayarlanabilir.",
    genislik: { min: 600, max: 1600, adim: 10 },
    yukseklik: { min: 700, max: 800, adim: 10 },
    derinlik: { min: 350, max: 550, adim: 10 },
    sutun: { min: 1, max: 1 },
    sira: { min: 1, max: 2 },
    varsayilan: { genislik: 1000, yukseklik: 750, derinlik: 420, sutun: 1, sira: 2, taban: "ahsap-ayak", arkaPanel: false },
    anahtarKelimeler: ["makyaj masası", "tuvalet masası", "şifonyer masası"],
  }),
];

export const MODELLER: MobilyaModeli[] = [...dolaplar, ...masalar];

export function modelBul(slug: string): MobilyaModeli | undefined {
  return MODELLER.find((m) => m.slug === slug);
}

export function odaBul(id: string): Oda | undefined {
  return ODALAR.find((o) => o.id === id);
}

export function odaModelleri(odaId: string): MobilyaModeli[] {
  return MODELLER.filter((m) => m.odalar.includes(odaId));
}

// ==========================================
// MONTAJ KURALLARI
//
// Bunlar hoşluk değil, mühendislik. 18 mm levha 90 santimden
// uzun açıklıkta zamanla bel verir; 25 santimden dar göz de
// kullanışsızdır. Bu yüzden genişlik büyüdükçe en az sütun
// sayısı artar, daraldıkça en çok sütun sayısı düşer.
//
// Masalarda bu kurallar işlemez: masanın ızgarası yok, tablayı
// kayıt taşıyor.
// ==========================================

export const GOZ_GENISLIK = { min: 250, max: 900 };
/**
 * Göz yüksekliğinin üst sınırı yapısal değil, kullanım
 * kaynaklı: aşırı yüksek bir göz rafsız bir boşluktur. 78
 * santim mutfak alt dolabının standart kapak boyu, o yüzden
 * sınır oraya kadar açık.
 */
export const GOZ_YUKSEKLIK = { min: 160, max: 780 };

const T = 18;

export function sutunSiniri(m: MobilyaModeli, genislik: number) {
  if (m.tur === "masa") return { min: m.sutun.min, max: m.sutun.max };
  const ic = genislik - 2 * T;
  const min = Math.max(m.sutun.min, Math.ceil((ic + T) / (GOZ_GENISLIK.max + T)));
  const max = Math.min(m.sutun.max, Math.max(min, Math.floor((ic + T) / (GOZ_GENISLIK.min + T))));
  return { min, max: Math.max(min, max) };
}

export function siraSiniri(
  m: MobilyaModeli,
  yukseklik: number,
  tabanYuksekligi: number
) {
  if (m.tur === "masa") return { min: m.sira.min, max: m.sira.max };
  const ic = yukseklik - tabanYuksekligi - 2 * T;
  const min = Math.max(m.sira.min, Math.ceil((ic + T) / (GOZ_YUKSEKLIK.max + T)));
  const max = Math.min(m.sira.max, Math.max(min, Math.floor((ic + T) / (GOZ_YUKSEKLIK.min + T))));
  return { min, max: Math.max(min, max) };
}

export function varsayilanYapilandirma(m: MobilyaModeli): MobilyaYapilandirma {
  return {
    modelId: m.id,
    genislik: m.varsayilan.genislik,
    yukseklik: m.varsayilan.yukseklik,
    derinlik: m.varsayilan.derinlik,
    sutun: m.varsayilan.sutun,
    sira: m.varsayilan.sira,
    gozler: { ...(m.varsayilan.gozler ?? {}) },
    govdeMalzeme: "acik-mese",
    onMalzeme: "acik-mese",
    taban: m.varsayilan.taban,
    kulp: "cubuk-siyah",
    arkaPanel: m.varsayilan.arkaPanel,
  };
}
