// ==========================================
// ÖRNEK SİPARİŞLER (yerel)
//
// Mantık src/lib/tasarim/ornekSiparisler.ts içinde; canlıda aynı
// işi admin → Kendin Üret Atölyesi → "Örnek siparişleri oluştur"
// yapar.
//
// Önce tasarım ürünleri:  npm run db:seed:tasarim
// Sonra:                  npm run db:seed:ornek-siparis
// ==========================================

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ornekSiparisleriKur } from "../src/lib/tasarim/ornekSiparisler";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const { kurulan, atlanan } = await ornekSiparisleriKur(prisma);
  for (const k of kurulan) console.log(`  ✓ ${k.no} — ${k.urun} — ${k.tutar} TL`);
  for (const a of atlanan) console.log(`  – ${a.urun}: ${a.neden}`);
  console.log("\nÖrnek siparişler hazır.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
