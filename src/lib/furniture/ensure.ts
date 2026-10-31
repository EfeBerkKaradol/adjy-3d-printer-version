import { prisma } from "@/lib/db";
import { type MobilyaModeli, odaBul, varsayilanYapilandirma } from "./catalog";
import { fiyatiYuvarla, mobilyaFiyati } from "./pricing";
import { furnitureSku } from "./sku";

// ==========================================
// MOBİLYANIN VERİTABANI BAĞLANTISI
//
// Yalnızca sunucuda çalışır: prisma'yı içe aktardığı için
// istemci bileşeninden çağrılırsa derleme hata verir.
//
// Sepet ve sipariş kalemi gerçek bir ürün satırına bağlanmak
// zorunda; mobilya modelleri ise kodda tanımlı, çünkü onlar
// satır değil üreteç.
//
// Bu bağ önce elle çalıştırılan bir betiğe bırakılmıştı ve
// betik çalışmadığı sürece bütün yapılandırıcı sayfaları 404
// veriyordu. Bir bölümün açık olması, kimsenin hatırlaması
// gereken ayrı bir adıma bağlı olmamalı.
//
// Artık sayfa kendi bağlantısını kuruyor. İşlem fikir
// değiştirmez: aynı SKU ikinci kez açılmaz, yalnızca
// güncellenir. Yalnızca kodda tanımlı modeller için çalışır,
// yani dışarıdan gelen bir adresle rastgele ürün
// yaratılamaz.
// ==========================================

/** Oda kategorileri sayfa ömrü boyunca bir kez çözülür */
const kategoriOnbellek = new Map<string, string>();

async function odaKategorisi(odaId: string): Promise<string | null> {
  const onbellekte = kategoriOnbellek.get(odaId);
  if (onbellekte) return onbellekte;

  const oda = odaBul(odaId);
  if (!oda) return null;

  // Mobilya kategorileri pasif: Koleksiyonlar sayfası aktif
  // kategorileri listeliyor ve mobilyanın orada boş bir kart
  // olarak görünmesi gerekmiyor — kendi bölümü var.
  const ust = await prisma.category.upsert({
    where: { slug: "mobilya" },
    update: {},
    create: {
      name: "Mobilya",
      slug: "mobilya",
      description:
        "Ölçüsü, sütunu ve gözleri sipariş sırasında belirlenen modüler mobilya.",
      isActive: false,
      sortOrder: 50,
    },
    select: { id: true },
  });

  const kategori = await prisma.category.upsert({
    where: { slug: `mobilya-${oda.id}` },
    update: {},
    create: {
      name: oda.ad,
      slug: `mobilya-${oda.id}`,
      description: oda.aciklama,
      parentId: ust.id,
      isActive: false,
      sortOrder: 51,
    },
    select: { id: true },
  });

  kategoriOnbellek.set(odaId, kategori.id);
  return kategori.id;
}

/**
 * Modelin veritabanı karşılığını döndürür, yoksa açar.
 * Satır açılamazsa null döner — sayfa o zaman açılmaz,
 * çünkü sepete eklenemeyen bir yapılandırıcı kırık bir
 * düğmeden ibaret olur.
 */
export async function mobilyaUrunuBul(
  model: MobilyaModeli
): Promise<string | null> {
  const sku = furnitureSku(model.id);

  const mevcut = await prisma.product.findUnique({
    where: { sku },
    select: { id: true },
  });
  if (mevcut) return mevcut.id;

  const kategoriId = await odaKategorisi(model.oda);
  if (!kategoriId) return null;

  const varsayilan = varsayilanYapilandirma(model);
  const fiyat = fiyatiYuvarla(
    mobilyaFiyati(varsayilan, { iscilikCarpani: model.iscilikCarpani }).toplam
  );

  try {
    const urun = await prisma.product.upsert({
      where: { sku },
      update: {},
      create: {
        name: model.ad,
        slug: `mobilya-${model.slug}`,
        sku,
        description: model.aciklama,
        basePrice: fiyat,
        categoryId: kategoriId,
        materialType: "MDF Lam",
        widthMm: varsayilan.genislik,
        heightMm: varsayilan.yukseklik,
        depthMm: varsayilan.derinlik,
        stockQty: 999,
        // Mağaza listesi yalnızca aktif ürünleri gösteriyor;
        // mobilya oraya fotoğrafsız kartlar olarak düşmemeli.
        // Sipariş akışı isActive'e bakmıyor, sepet çalışır.
        isActive: false,
        featured: false,
      },
      select: { id: true },
    });
    return urun.id;
  } catch {
    // İki istek aynı anda açmaya çalışmış olabilir; ikincisi
    // için satır artık vardır.
    const sonra = await prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    return sonra?.id ?? null;
  }
}
