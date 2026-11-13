// ==========================================
// ÜRÜNLERE ORTAM FOTOĞRAFI EKLE
//
// ADJY ajanının Rhino'da ürettiği gerçekçi ortam renderlarını
// (ahşap masa, oda, bitki/süs sahnesi) ürün galerisine ek fotoğraf
// olarak koyar. Ana görsel (thumbnailUrl) değişmez; yeni fotoğraf
// galerinin başına eklenir, yani ürün sayfasında ikinci sırada
// görünür. Aynı ürüne ikinci kez çalıştırılırsa önceki ortam
// fotoğrafının yerini alır (çoğalmaz).
//
// Klasördeki her "<ürün-slug>.jpg" o ürüne gider.
//
//   npx tsx prisma/galeri-ekle.ts <klasör>              → plan
//   npx tsx prisma/galeri-ekle.ts <klasör> --uygula     → yükler ve kaydeder
// Canlı (Neon) veritabanında ayrıca --canli gerekir.
// ==========================================

import "dotenv/config";
import { readdirSync } from "fs";
import { join, basename } from "path";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const FOLDER = "adjy/products/ortam";
const klasor = process.argv[2];
const uygula = process.argv.includes("--uygula");
const canli = process.argv.includes("--canli");
const url = process.env.DATABASE_URL ?? "";

function galeri(g: unknown): string[] {
  return Array.isArray(g) ? g.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
}

async function main() {
  if (!klasor || klasor.startsWith("--")) throw new Error("Kullanım: npx tsx prisma/galeri-ekle.ts <klasör> [--uygula]");
  if (!url) throw new Error("DATABASE_URL yok");
  const host = url.replace(/^[^@]*@/, "").replace(/[/?].*$/, "");
  const canliDb = /neon\.tech|vercel|supabase|amazonaws/.test(host);
  console.log(`Veritabanı: ${host}${canliDb ? "  (CANLI)" : ""}`);
  console.log(uygula ? "Mod: UYGULA\n" : "Mod: yalnızca plan (değişiklik yapılmaz)\n");
  if (uygula && canliDb && !canli) throw new Error("Canlı veritabanı: bilerek çalıştırıyorsanız --canli ekleyin.");
  if (uygula && !process.env.CLOUDINARY_API_SECRET) throw new Error("CLOUDINARY_* ortam değişkenleri yok");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const dosyalar = readdirSync(klasor).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const slugs = dosyalar.map((f) => basename(f).replace(/\.[^.]+$/, ""));
    const urunler = await prisma.product.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, name: true, gallery: true },
    });
    const bySlug = new Map(urunler.map((u) => [u.slug, u]));
    let n = 0;
    for (const f of dosyalar) {
      const slug = basename(f).replace(/\.[^.]+$/, "");
      const u = bySlug.get(slug);
      if (!u) {
        console.log(`  - ${f}: bu slug'da ürün yok, atlandı`);
        continue;
      }
      const eski = galeri(u.gallery);
      const temiz = eski.filter((g) => !g.includes(`/${FOLDER}/`));
      console.log(`  ${u.name}: galeri ${eski.length} → ${temiz.length + 1}${temiz.length < eski.length ? " (önceki ortam fotoğrafı değişiyor)" : ""}`);
      if (!uygula) continue;
      const r = await cloudinary.uploader.upload(join(klasor, f), {
        folder: FOLDER,
        public_id: `${slug}-ortam-${Date.now()}`,
        resource_type: "image",
      });
      await prisma.product.update({ where: { id: u.id }, data: { gallery: [r.secure_url, ...temiz] } });
      console.log(`      ${r.secure_url}`);
      n++;
    }
    console.log(uygula ? `\n${n} ürüne ortam fotoğrafı eklendi.` : "\nPlan tamam. Uygulamak için --uygula ekleyin.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
