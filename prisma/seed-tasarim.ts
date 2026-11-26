// ==========================================
// TASARIM ARAÇLARINI VERİTABANINA BAĞLA
//
// Tasarım araçları (saksı, avize, litofan lamba…) kodda
// tanımlı: src/lib/tasarim/catalog.ts. Sepet ve sipariş kalemi
// ise gerçek bir ürün satırına bağlanmak zorunda. Bu betik her
// araç için o satırı açar ya da günceller.
//
// Çalıştırmak şart değil: satırlar /tasarla sayfası ilk
// açıldığında da kendiliğinden oluşur. Betik iki işe yarar:
//
//   - yeni bir ortamda araçların mağaza listesinde hemen
//     görünmesi;
//   - katalogdaki ad, açıklama ya da fiyat değiştiğinde var
//     olan satırların güncellenmesi (sayfa yalnızca eksik satırı
//     açar, var olana dokunmaz).
//
// Çalıştırmak için:  npm run db:seed:tasarim
// Tekrar çalıştırmak güvenli.
// ==========================================

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  TASARIM_ARACLARI,
  TASARIM_KATEGORISI,
  ETIKET_ADLARI,
  aracGorseli,
  tasarimUrunSlug,
  type TasarimAraci,
} from "../src/lib/tasarim/catalog";
import { tasarimBaslangicFiyati } from "../src/lib/tasarim/pricing";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const baslangicFiyati = (arac: TasarimAraci) => tasarimBaslangicFiyati(arac);

async function main() {
  const ortak = await prisma.category.upsert({
    where: { slug: TASARIM_KATEGORISI.slug },
    update: {
      name: TASARIM_KATEGORISI.ad,
      description: TASARIM_KATEGORISI.aciklama,
    },
    create: {
      name: TASARIM_KATEGORISI.ad,
      slug: TASARIM_KATEGORISI.slug,
      description: TASARIM_KATEGORISI.aciklama,
      isActive: true,
      sortOrder: 40,
    },
    select: { id: true },
  });

  for (const arac of TASARIM_ARACLARI) {
    // Mağazada karşılığı olan kategori varsa ürün oraya girer
    let kategoriId = ortak.id;
    for (const slug of arac.kategoriler) {
      const k = await prisma.category.findFirst({
        where: { slug, isActive: true },
        select: { id: true },
      });
      if (k) {
        kategoriId = k.id;
        break;
      }
    }

    const veri = {
      name: arac.ad,
      slug: tasarimUrunSlug(arac.id),
      description: arac.aciklama,
      basePrice: baslangicFiyati(arac),
      categoryId: kategoriId,
      thumbnailUrl: aracGorseli(arac.id),
      materialType: arac.malzeme,
      materialWeight: arac.varsayilan.kutleG,
      printTimeEst: Math.round(arac.varsayilan.sureSaat * 60),
      isActive: true,
    };
    const sku = `TSR-${arac.id.toUpperCase()}`;
    const urun = await prisma.product.upsert({
      where: { sku },
      update: veri,
      create: { ...veri, sku, stockQty: 999, featured: false },
      select: { id: true },
    });
    // Koleksiyon etiketleri (ör. yılbaşı araçları → koleksiyon-yilbasi)
    for (const slug of arac.etiketler ?? []) {
      const etiket = await prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { slug, name: ETIKET_ADLARI[slug] ?? slug },
        select: { id: true },
      });
      await prisma.productTag.upsert({
        where: { productId_tagId: { productId: urun.id, tagId: etiket.id } },
        update: {},
        create: { productId: urun.id, tagId: etiket.id },
      });
    }
    console.log(`  ✓ ${arac.ad} — ${veri.basePrice} TL`);
  }
}

main()
  .then(() => console.log("\nTasarım araçları hazır."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
