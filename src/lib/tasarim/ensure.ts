import { prisma } from "@/lib/db";
import {
  TASARIM_ARACLARI,
  TASARIM_KATEGORISI,
  ETIKET_ADLARI,
  aracGorseli,
  tasarimUrunSlug,
  type TasarimAraci,
} from "./catalog";
import { tasarimBaslangicFiyati } from "./pricing";
import { tasarimSku } from "./order";

// ==========================================
// TASARIM ARAÇLARININ VERİTABANI BAĞLANTISI
//
// Yalnızca sunucuda çalışır.
//
// Sepet ve sipariş kalemi gerçek bir ürün satırına bağlanmak
// zorunda; araçlar ise kodda tanımlı. Bu dosya ikisini
// birbirine bağlar: her aracın bir ürün satırı olur.
//
// Mobilyadan farkı: bu satırlar AKTİF. Araçlar mağazada ürün
// olarak görünüyor — kartı, fiyatı ve görseli var; karta
// tıklayan tasarım aracına gider.
//
// Satırlar elle çalıştırılan bir betiği beklemez; ilk
// ziyarette açılır. Aynı SKU ikinci kez açılmaz. Yalnızca
// kodda tanımlı araçlar için çalıştığından dışarıdan gelen
// bir adresle rastgele ürün yaratılamaz.
// ==========================================

const kategoriOnbellek = new Map<string, string>();

/**
 * Aracın kategorisi: mağazada karşılığı varsa o (saksı saksıların
 * yanında dursun), yoksa ortak "Kendin Tasarla" kategorisi.
 */
async function aracKategorisi(arac: TasarimAraci): Promise<string> {
  const onbellekte = kategoriOnbellek.get(arac.id);
  if (onbellekte) return onbellekte;

  if (arac.kategoriler.length > 0) {
    const adaylar = await prisma.category.findMany({
      where: { slug: { in: arac.kategoriler }, isActive: true },
      select: { id: true, slug: true },
    });
    for (const slug of arac.kategoriler) {
      const bulunan = adaylar.find((k) => k.slug === slug);
      if (bulunan) {
        kategoriOnbellek.set(arac.id, bulunan.id);
        return bulunan.id;
      }
    }
  }

  const ortak = await prisma.category.upsert({
    where: { slug: TASARIM_KATEGORISI.slug },
    update: {},
    create: {
      name: TASARIM_KATEGORISI.ad,
      slug: TASARIM_KATEGORISI.slug,
      description: TASARIM_KATEGORISI.aciklama,
      isActive: true,
      sortOrder: 40,
    },
    select: { id: true },
  });
  kategoriOnbellek.set(arac.id, ortak.id);
  return ortak.id;
}

// Araç → ürün satırı eşlemesi, sunucu başına bellekte tutulur.
//
// /tasarla ve /uret her istekte on aracın satırını tek tek
// soruyordu: sayfanın kendisi veritabanından hiçbir şey
// göstermediği hâlde on sorgu bekleniyordu.
//
// Yalnızca bulunan satırlar yazılır; açılamayan (null) araç
// sonraki istekte yeniden denenir. Süre sınırı, yönetim
// panelinden silinen bir satırın sunucu yeniden başlayana kadar
// "var" sayılmaması için: en geç beş dakika sonra yeniden aranır
// ve yoksa açılır.
const URUN_ONBELLEK_SURESI_MS = 5 * 60 * 1000;
const urunOnbellek = new Map<string, { id: string; an: number }>();

function onbellektekiUrun(aracId: string): string | null {
  const kayit = urunOnbellek.get(aracId);
  if (!kayit) return null;
  if (Date.now() - kayit.an > URUN_ONBELLEK_SURESI_MS) {
    urunOnbellek.delete(aracId);
    return null;
  }
  return kayit.id;
}

/**
 * Aracın ürün satırını döndürür, yoksa açar.
 * Açılamazsa null — sayfa yine açılır ama sepete eklenemez.
 */
export async function tasarimUrunuBul(arac: TasarimAraci): Promise<string | null> {
  const onbellekte = onbellektekiUrun(arac.id);
  if (onbellekte) return onbellekte;

  const id = await urunuBulVeyaAc(arac);
  if (id) urunOnbellek.set(arac.id, { id, an: Date.now() });
  return id;
}

async function urunuBulVeyaAc(arac: TasarimAraci): Promise<string | null> {
  const sku = tasarimSku(arac.id);

  try {
    const mevcut = await prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (mevcut) return mevcut.id;

    const kategoriId = await aracKategorisi(arac);
    const urun = await prisma.product.upsert({
      where: { sku },
      update: {},
      create: {
        name: arac.ad,
        slug: tasarimUrunSlug(arac.id),
        sku,
        description: arac.aciklama,
        basePrice: tasarimBaslangicFiyati(arac),
        categoryId: kategoriId,
        thumbnailUrl: aracGorseli(arac.id),
        materialType: arac.malzeme,
        materialWeight: arac.varsayilan.kutleG,
        printTimeEst: Math.round(arac.varsayilan.sureSaat * 60),
        stockQty: 999,
        isActive: true,
        featured: false,
        // Koleksiyon etiketleri (yılbaşı araçları yılbaşı koleksiyonunda)
        ...(arac.etiketler?.length
          ? {
              tags: {
                create: arac.etiketler.map((slug) => ({
                  tag: {
                    connectOrCreate: {
                      where: { slug },
                      create: { slug, name: ETIKET_ADLARI[slug] ?? slug },
                    },
                  },
                })),
              },
            }
          : {}),
      },
      select: { id: true },
    });
    return urun.id;
  } catch {
    // İki istek aynı anda açmaya çalışmış ya da veritabanına
    // ulaşılamamış olabilir.
    try {
      const sonra = await prisma.product.findUnique({
        where: { sku },
        select: { id: true },
      });
      return sonra?.id ?? null;
    } catch {
      return null;
    }
  }
}

/**
 * Bütün araçların satırlarını açar — liste sayfası ve seed betiği için.
 *
 * Bellekte olmayanlar tek sorguda aranır (araç başına bir sorgu
 * değil). Satırı hiç olmayan araç için açma yolu sırayla işler:
 * kategorisiz araçlar aynı ortak kategoriyi açtığından yan yana
 * çalışınca birbirleriyle çakışırlar.
 */
export async function tumTasarimUrunleri(): Promise<Map<string, string>> {
  const sonuc = new Map<string, string>();
  const aranacak: TasarimAraci[] = [];
  for (const arac of TASARIM_ARACLARI) {
    const id = onbellektekiUrun(arac.id);
    if (id) sonuc.set(arac.id, id);
    else aranacak.push(arac);
  }
  if (aranacak.length === 0) return sonuc;

  const mevcut = new Map<string, string>();
  try {
    const satirlar = await prisma.product.findMany({
      where: { sku: { in: aranacak.map((a) => tasarimSku(a.id)) } },
      select: { id: true, sku: true },
    });
    for (const s of satirlar) if (s.sku) mevcut.set(s.sku, s.id);
  } catch {
    // Veritabanına ulaşılamadı: araç başına yeniden denemek aynı
    // hatayı on kez bekletir. Eldekiyle dönülür, sonraki istek dener.
    return sonuc;
  }

  for (const arac of aranacak) {
    const bulunan = mevcut.get(tasarimSku(arac.id));
    if (bulunan) urunOnbellek.set(arac.id, { id: bulunan, an: Date.now() });
    const id = bulunan ?? (await tasarimUrunuBul(arac));
    if (id) sonuc.set(arac.id, id);
  }
  return sonuc;
}

let hazirlik: Promise<void> | null = null;

/**
 * Mağaza listesi için: araçların ürün satırlarını sunucu başına bir
 * kez hazırlar. Biri /tasarla'ya hiç girmeden mağazaya gelse de
 * parametrik ürünler listede görünür. Bir satır açılamadıysa
 * (ör. veritabanına ulaşılamadı) sonraki istekte yeniden denenir.
 */
export function tasarimUrunleriniHazirla(): Promise<void> {
  if (!hazirlik) {
    hazirlik = tumTasarimUrunleri().then((sonuc) => {
      if (sonuc.size < TASARIM_ARACLARI.length) hazirlik = null;
    });
  }
  return hazirlik;
}
