// ==========================================
// MOBİLYA ÜRÜNLERİNİ VERİTABANINA BAĞLA
//
// Mobilya modelleri kodda tanımlı, çünkü onlar satır değil
// üreteç: bir kitaplığın "stoğu" yok, ölçüsü ve gözleri var ve
// her kombinasyon ayrı bir ürün. Hepsini satır olarak tutmak
// milyonlarca satır ederdi.
//
// Ama sepet ve sipariş kalemi gerçek bir ürün satırına
// bağlanmak zorunda. Bu betik her model için o bağlantı
// satırını açar.
//
// Satırlar isActive = false. Mağaza listesi yalnızca aktif
// ürünleri gösteriyor; mobilyanın orada fotoğrafsız kartlar
// hâlinde görünmesini istemiyoruz — mobilyanın kendi bölümü
// var. Sipariş akışı isActive'e bakmadığı için sepet ve
// ödeme sorunsuz çalışır.
//
// Çalıştırmak için:  npm run db:seed:furniture
// Tekrar çalıştırmak güvenli: var olan satırlar güncellenir.
// ==========================================

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { MODELLER, ODALAR, varsayilanYapilandirma } from "../src/lib/furniture/catalog";
import { fiyatiYuvarla, mobilyaFiyati } from "../src/lib/furniture/pricing";
import { furnitureSku } from "../src/lib/furniture/sku";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Üst kategori ---
  const ust = await prisma.category.upsert({
    where: { slug: "mobilya" },
    update: { name: "Mobilya", isActive: true },
    create: {
      name: "Mobilya",
      slug: "mobilya",
      description:
        "Ölçüsü, sütunu ve gözleri sipariş sırasında belirlenen modüler mobilya.",
      isActive: true,
      sortOrder: 50,
    },
  });
  console.log(`üst kategori: ${ust.slug}`);

  // --- Oda kategorileri ---
  const odaId = new Map<string, string>();
  for (const [i, oda] of ODALAR.entries()) {
    const k = await prisma.category.upsert({
      where: { slug: `mobilya-${oda.id}` },
      update: { name: oda.ad, parentId: ust.id, isActive: true },
      create: {
        name: oda.ad,
        slug: `mobilya-${oda.id}`,
        description: oda.aciklama,
        parentId: ust.id,
        isActive: true,
        sortOrder: 51 + i,
      },
    });
    odaId.set(oda.id, k.id);
    console.log(`  oda: ${k.slug}`);
  }

  // --- Modeller ---
  for (const model of MODELLER) {
    const kategori = odaId.get(model.oda);
    if (!kategori) {
      console.warn(`  ! ${model.ad}: odası yok (${model.oda})`);
      continue;
    }
    const varsayilan = varsayilanYapilandirma(model);
    const fiyat = fiyatiYuvarla(
      mobilyaFiyati(varsayilan, { iscilikCarpani: model.iscilikCarpani }).toplam
    );
    const sku = furnitureSku(model.id);

    await prisma.product.upsert({
      where: { sku },
      update: {
        name: model.ad,
        description: model.aciklama,
        basePrice: fiyat,
        categoryId: kategori,
        materialType: "MDF Lam",
        widthMm: varsayilan.genislik,
        heightMm: varsayilan.yukseklik,
        depthMm: varsayilan.derinlik,
        isActive: false,
      },
      create: {
        name: model.ad,
        slug: `mobilya-${model.slug}`,
        sku,
        description: model.aciklama,
        basePrice: fiyat,
        categoryId: kategori,
        materialType: "MDF Lam",
        widthMm: varsayilan.genislik,
        heightMm: varsayilan.yukseklik,
        depthMm: varsayilan.derinlik,
        stockQty: 999,
        isActive: false,
        featured: false,
      },
    });
    console.log(
      `  ${model.ad.padEnd(22)} ${sku.padEnd(26)} ${fiyat.toLocaleString("tr-TR")} TL`
    );
  }

  console.log(`\n${MODELLER.length} mobilya modeli bağlandı.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
