// ==========================================
// ÜRÜNLERİN WEB 3D MODELLERİNİ TOPLU DEĞİŞTİR
//
// Panelin STL yükleyicisi modeli tarayıcıda ızgaraya
// yuvarlayarak sadeleştiriyordu; çıkan GLB'lerde yüzlerce kopuk
// parça, delik ve ters yüz vardı (ürün sayfasında "yüzey
// hataları"). Modeller ADJY ajanında Rhino 8'de onarılıp yeniden
// üretildi; bu betik onları Cloudinary'ye yükler ve ürünün
// modelFileUrl alanını günceller. Başka hiçbir alana dokunmaz.
//
// Klasördeki her "<ürün-slug>.glb" o ürüne gider. Eşleşmeyen
// dosya atlanır. Eski dosya Cloudinary'de kalır (geri dönüş
// için eski adres çıktıda yazılır).
//
// Çalıştırma:
//   npx tsx prisma/web-model-yukle.ts <klasör>              → plan (değişiklik yok)
//   npx tsx prisma/web-model-yukle.ts <klasör> --uygula     → yükler ve kaydeder
// Canlı (Neon) veritabanında ayrıca --canli gerekir.
// ==========================================

import "dotenv/config";
import { readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const FOLDER = "adjy/web-models";

const klasor = process.argv[2];
const uygula = process.argv.includes("--uygula");
const canli = process.argv.includes("--canli");
const url = process.env.DATABASE_URL ?? "";

async function main() {
  if (!klasor || klasor.startsWith("--")) throw new Error("Kullanım: npx tsx prisma/web-model-yukle.ts <klasör> [--uygula]");
  if (!url) throw new Error("DATABASE_URL yok");
  const host = url.replace(/^[^@]*@/, "").replace(/[/?].*$/, "");
  const canliDb = /neon\.tech|vercel|supabase|amazonaws/.test(host);
  console.log(`Veritabanı: ${host}${canliDb ? "  (CANLI)" : ""}`);
  console.log(uygula ? "Mod: UYGULA\n" : "Mod: yalnızca plan (değişiklik yapılmaz)\n");
  if (uygula && canliDb && !canli) throw new Error("Canlı veritabanı: bilerek çalıştırıyorsanız --canli ekleyin.");
  if (uygula && !process.env.CLOUDINARY_API_SECRET) throw new Error("CLOUDINARY_* ortam değişkenleri yok");

  const dosyalar = readdirSync(klasor).filter((f) => f.toLowerCase().endsWith(".glb"));
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    const slugs = dosyalar.map((f) => basename(f, ".glb"));
    const urunler = await prisma.product.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, name: true, modelFileUrl: true },
    });
    const bySlug = new Map(urunler.map((u) => [u.slug, u]));

    let yapilan = 0;
    for (const f of dosyalar.sort()) {
      const slug = basename(f, ".glb");
      const u = bySlug.get(slug);
      const kb = Math.round(statSync(join(klasor, f)).size / 1024);
      if (!u) {
        console.log(`  - ${f}: bu slug'da ürün yok, atlandı`);
        continue;
      }
      console.log(`  ${u.name} (${kb} KB)`);
      console.log(`      eski: ${u.modelFileUrl ?? "—"}`);
      if (!uygula) continue;

      const r = await cloudinary.uploader.upload(join(klasor, f), {
        resource_type: "raw",
        folder: FOLDER,
        public_id: `${slug}-${Date.now()}.glb`,
        overwrite: false,
      });
      await prisma.product.update({ where: { id: u.id }, data: { modelFileUrl: r.secure_url } });
      console.log(`      yeni: ${r.secure_url}`);
      yapilan++;
    }
    console.log(uygula ? `\n${yapilan} ürünün modeli güncellendi.` : "\nPlan tamam. Uygulamak için --uygula ekleyin.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
