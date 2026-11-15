import { TASARIM_ARACLARI, aracGorselleri } from "@/lib/tasarim/catalog";

// ==========================================
// YEREL GÖRSEL DOĞRULAMASI
// Veritabanındaki bazı kayıtlar public/ altında
// karşılığı olmayan yollara işaret ediyor
// (ör. /assets/categories/*.svg). Bunları tarayıcıya
// göndermek 404 üretir ve kırık görsel riski doğurur;
// sunucuda eleyip null döndürüyoruz.
//
// Eskiden dosyanın varlığına diskten bakılıyordu
// (existsSync(process.cwd()/public/…)). Next, hangi dosyaya
// bakılacağını derlemede bilemediği için public/ klasörünün
// tamamını (12 MB) bu işlevi çağıran her sayfanın sunucu
// paketine kopyalıyordu: /collections, /tasarla, /tasarla/[arac].
//
// Artık diske bakılmıyor; public/ altındaki görseller aşağıda
// sayılı. Yerel görseller iki kümeden ibaret olduğu için liste
// kısa: public/assets ve tasarım araçlarının kareleri.
//
// public/assets altına yeni bir görsel eklenirse listeye de
// eklenmeli. Eklenmezse görsel "yok" sayılır ve yerine yedek
// çizilir — kırık kare görünmez, yalnızca yeni görsel görünmez.
// ==========================================

/** public/assets altındaki dosyalar */
const VARLIKLAR = [
  "/assets/payment/iyzico.svg",
  "/assets/payment/mastercard.svg",
  "/assets/payment/visa.svg",
  "/assets/products/anahtarlik-1.svg",
  "/assets/products/anahtarlik-2.svg",
  "/assets/products/anahtarlik-thumb.svg",
  "/assets/products/bileklik-1.svg",
  "/assets/products/bileklik-thumb.svg",
  "/assets/products/disli-1.svg",
  "/assets/products/disli-thumb.svg",
  "/assets/products/kalem-1.svg",
  "/assets/products/kalem-kutusu-thumb.svg",
  "/assets/products/lamba-1.svg",
  "/assets/products/lamba-2.svg",
  "/assets/products/lamba-thumb.svg",
  "/assets/products/stand-1.svg",
  "/assets/products/stand-2.svg",
  "/assets/products/stand-thumb.svg",
  "/assets/products/vazo-1.svg",
  "/assets/products/vazo-2.svg",
  "/assets/products/vazo-3.svg",
  "/assets/products/vazo-thumb.svg",
];

const YEREL_GORSELLER = new Set<string>([
  ...VARLIKLAR,
  // public/tasarim-araclari/_gorsel: her aracın kareleri katalogla
  // birlikte depoya girer; adresleri de katalogdan üretilir.
  ...TASARIM_ARACLARI.flatMap((arac) => aracGorselleri(arac).map((g) => g.adres)),
]);

/**
 * Yerel bir public/ yolu gerçekten var mı?
 * Uzak URL'ler (http/https) her zaman geçerli sayılır.
 */
export function resolvePublicImage(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/")) return null;

  // Sorgu parçaları dosya adına dâhil değil
  const clean = url.split("?")[0].split("#")[0];
  return YEREL_GORSELLER.has(clean) ? url : null;
}
