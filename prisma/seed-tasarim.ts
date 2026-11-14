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
  aracGorseli,
  tasarimUrunSlug,
  type TasarimAraci,
} from "../src/lib/tasarim/catalog";
import { productionCost, sellingPrice } from "../src/lib/production";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// src/lib/tasarim/pricing.ts ile aynı hesap. O dosya "@/" takma
// adıyla içe aktarım yaptığı için betikten doğrudan çağrılamıyor.
function baslangicFiyati(arac: TasarimAraci): number {
  const maliyet = productionCost({
    route: "fdm",
    weightGrams: arac.varsayilan.kutleG,
    printMinutes: arac.varsayilan.sureSaat * 60,
    largestMm: arac.enUzunMm,
  });
  const fiyat = sellingPrice(maliyet.unitCost + (arac.ekMaliyet ?? 0)).unitPriceGross;
  return Math.max(arac.tabanFiyat, Math.ceil(fiyat / 5) * 5);
}

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
    await prisma.product.upsert({
      where: { sku },
      update: veri,
      create: { ...veri, sku, stockQty: 999, featured: false },
    });
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
