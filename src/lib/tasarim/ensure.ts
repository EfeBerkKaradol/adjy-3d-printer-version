import { prisma } from "@/lib/db";
import {
  TASARIM_ARACLARI,
  TASARIM_KATEGORISI,
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

/**
 * Aracın ürün satırını döndürür, yoksa açar.
 * Açılamazsa null — sayfa yine açılır ama sepete eklenemez.
 */
export async function tasarimUrunuBul(arac: TasarimAraci): Promise<string | null> {
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

/** Bütün araçların satırlarını açar — liste sayfası ve seed betiği için */
export async function tumTasarimUrunleri(): Promise<Map<string, string>> {
  const sonuc = new Map<string, string>();
  for (const arac of TASARIM_ARACLARI) {
    const id = await tasarimUrunuBul(arac);
    if (id) sonuc.set(arac.id, id);
  }
  return sonuc;
}
