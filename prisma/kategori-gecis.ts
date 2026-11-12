// ==========================================
// KATEGORİ YAPISINA GEÇİŞ (Kasım 2026)
//
// Mağaza kategorileri kullanım alanına göre 7 ana kategori +
// alt kategoriler olarak yeniden düzenlenir. Hediye, Yılbaşı
// gibi gruplar kategori değil "koleksiyon" etiketi olur; bir
// ürün birden çok koleksiyonda olabilir.
//
//   Aydınlatma        · Masa & Gece Lambaları, Litofan Lambalar
//   Bitki & Saksı     · Vazolar, Saksılar, Köklendirme & Bitki Standı
//   Dekorasyon        · Biblo & Heykel, Şamdan & Tütsülük, Kase & Tepsi, Süsler
//   Masa & Ofis       · Standlar, Masa Düzenleyiciler
//   Düzen & Depolama  · Duvar Rafları, Delikli Pano & Aksesuar, Kutular
//   Hobi & Boyama     · Boyanabilir Alçı Setleri
//   Mimari Maketler   · Antik, Orta Çağ & Gotik, Rönesans & Barok, Modern, Çağdaş
//
// Var olan slug'lar korunur (aydinlatma, vazo-saksi, ev-dekorasyon,
// ofis-aksesuarlari) — eski bağlantılar çalışmaya devam eder.
// Boşalan eski kategoriler silinmez, yalnızca pasife alınır.
// Mobilya bölümüne dokunulmaz.
//
// Çalıştırma:
//   npx tsx prisma/kategori-gecis.ts             → yalnızca planı yazar (değişiklik yok)
//   npx tsx prisma/kategori-gecis.ts --uygula    → uygular (tek transaction)
// Canlı (Neon) veritabanında ayrıca --canli gerekir.
// Tekrar çalıştırmak güvenli.
// ==========================================

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type Alt = { slug: string; name: string };
type Ana = { slug: string; name: string; description: string; alt: Alt[] };

const AGAC: Ana[] = [
  {
    slug: "aydinlatma",
    name: "Aydınlatma",
    description: "Masa ve gece lambaları, litofan ve ışıklı dekoratif objeler.",
    alt: [
      { slug: "aydinlatma-masa-gece", name: "Masa & Gece Lambaları" },
      { slug: "aydinlatma-litofan", name: "Litofan Lambalar" },
    ],
  },
  {
    slug: "vazo-saksi",
    name: "Bitki & Saksı",
    description: "Vazolar, saksılar, köklendirme ve bitki standları.",
    alt: [
      { slug: "vazo-saksi-vazolar", name: "Vazolar" },
      { slug: "vazo-saksi-saksilar", name: "Saksılar" },
      { slug: "vazo-saksi-koklendirme", name: "Köklendirme & Bitki Standı" },
    ],
  },
  {
    slug: "ev-dekorasyon",
    name: "Dekorasyon",
    description: "Biblo, heykel, şamdan, tütsülük, kase ve süsler.",
    alt: [
      { slug: "dekorasyon-biblo-heykel", name: "Biblo & Heykel" },
      { slug: "dekorasyon-samdan-tutsuluk", name: "Şamdan & Tütsülük" },
      { slug: "dekorasyon-kase-tepsi", name: "Kase & Tepsi" },
      { slug: "dekorasyon-susler", name: "Süsler" },
    ],
  },
  {
    slug: "ofis-aksesuarlari",
    name: "Masa & Ofis",
    description: "Telefon, tablet ve oyun kolu standları, masa düzenleyiciler.",
    alt: [
      { slug: "masa-ofis-standlar", name: "Standlar" },
      { slug: "masa-ofis-duzenleyiciler", name: "Masa Düzenleyiciler" },
    ],
  },
  {
    slug: "duzen-depolama",
    name: "Düzen & Depolama",
    description: "Duvar rafları, delikli pano aksesuarları ve saklama kutuları.",
    alt: [
      { slug: "duzen-duvar-raflari", name: "Duvar Rafları" },
      { slug: "duzen-delikli-pano", name: "Delikli Pano & Aksesuar" },
      { slug: "duzen-kutular", name: "Kutular" },
    ],
  },
  {
    slug: "hobi-boyama",
    name: "Hobi & Boyama",
    description: "Boyanabilir alçı figürler ve hediye kutulu boyama setleri.",
    alt: [{ slug: "hobi-alci-setleri", name: "Boyanabilir Alçı Setleri" }],
  },
  {
    slug: "mimari-maket",
    name: "Mimari Maketler",
    description: "Dünyanın önemli yapılarının dönemlerine göre maketleri.",
    alt: [
      { slug: "maket-antik", name: "Antik" },
      { slug: "maket-gotik", name: "Orta Çağ & Gotik" },
      { slug: "maket-barok", name: "Rönesans & Barok" },
      { slug: "maket-modern", name: "Modern" },
      { slug: "maket-cagdas", name: "Çağdaş" },
    ],
  },
];

/** Ürün slug'ı → alt kategori slug'ı. Listede olmayan ürünlere dokunulmaz. */
const URUN: Record<string, string> = {
  "mantar-masa-lambasi": "aydinlatma-masa-gece",
  "ay-gece-lambasi": "aydinlatma-masa-gece",
  "isikli-masaustu-yilbasi-agaci": "aydinlatma-masa-gece",
  "isikli-minyatur-ev": "aydinlatma-masa-gece",
  "fotografli-litofan-gece-lambasi": "aydinlatma-litofan",

  "comlek-dokulu-vazo": "vazo-saksi-vazolar",
  "cizgili-fistolu-vazo": "vazo-saksi-vazolar",
  "berberi-motifli-kabartma-saksi": "vazo-saksi-saksilar",
  "ayakli-saksi": "vazo-saksi-saksilar",
  "kendinden-sulamali-saksi": "vazo-saksi-saksilar",
  "cam-tuplu-koklendirme-standi": "vazo-saksi-koklendirme",

  "minimal-kedi-biblo-seti": "dekorasyon-biblo-heykel",
  "sarilan-cift-heykeli": "dekorasyon-biblo-heykel",
  "findikkiran-asker-figuru": "dekorasyon-biblo-heykel",
  "heykelsi-samdan": "dekorasyon-samdan-tutsuluk",
  "kul-tutuculu-tutsuluk": "dekorasyon-samdan-tutsuluk",
  "kabartmali-dekoratif-kase": "dekorasyon-kase-tepsi",
  "dekoratif-depolama-tabagi": "dekorasyon-kase-tepsi",
  "fiyonk-agac-tepeligi": "dekorasyon-susler",
  "isme-ozel-sus-seti": "dekorasyon-susler",

  "oyun-kolu-standi": "masa-ofis-standlar",
  "tablet-standi": "masa-ofis-standlar",
  "kulaklik-standli-masa-duzenleyici": "masa-ofis-duzenleyiciler",

  "kose-rafi": "duzen-duvar-raflari",
  "dekoratif-kup-duvar-rafi": "duzen-duvar-raflari",
  "rafa-raf": "duzen-duvar-raflari",
  "delikli-duvar-paneli": "duzen-delikli-pano",
  "skadis-ikea-voronoi-duzenleyici": "duzen-delikli-pano",
  "istiflenebilir-depolama-kutusu": "duzen-kutular",

  "boyanabilir-alci-figur-seti": "hobi-alci-setleri",
  "hediye-kutulu-alci-boyama-seti": "hobi-alci-setleri",
};

/** Koleksiyonlar (etiket). Slug "koleksiyon-" ile başlamalı. */
const KOLEKSIYON: { slug: string; name: string; urunler: string[] }[] = [
  {
    slug: "koleksiyon-hediye",
    name: "Hediye Fikirleri",
    urunler: [
      "sarilan-cift-heykeli",
      "fotografli-litofan-gece-lambasi",
      "boyanabilir-alci-figur-seti",
      "hediye-kutulu-alci-boyama-seti",
      "minimal-kedi-biblo-seti",
    ],
  },
  {
    slug: "koleksiyon-kisiye-ozel",
    name: "Kişiye Özel",
    urunler: ["fotografli-litofan-gece-lambasi", "isme-ozel-sus-seti"],
  },
  {
    slug: "koleksiyon-yilbasi",
    name: "Yılbaşı",
    urunler: [
      "findikkiran-asker-figuru",
      "fiyonk-agac-tepeligi",
      "isikli-masaustu-yilbasi-agaci",
      "isikli-minyatur-ev",
      "isme-ozel-sus-seti",
    ],
  },
];

/** Boşalınca pasife alınacak eski kategoriler. */
const ESKI = ["figurler", "takilar", "hediye", "teknik-parcalar"];

const uygula = process.argv.includes("--uygula");
const canli = process.argv.includes("--canli");
const url = process.env.DATABASE_URL ?? "";

async function main() {
  if (!url) throw new Error("DATABASE_URL yok");
  const host = url.replace(/^[^@]*@/, "").replace(/[/?].*$/, "");
  const canliDb = /neon\.tech|vercel|supabase|amazonaws/.test(host);
  console.log(`Veritabanı: ${host}${canliDb ? "  (CANLI)" : ""}`);
  console.log(uygula ? "Mod: UYGULA\n" : "Mod: yalnızca plan (değişiklik yapılmaz)\n");
  if (uygula && canliDb && !canli) {
    throw new Error("Canlı veritabanı: bilerek çalıştırıyorsanız --canli ekleyin.");
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const urunler = await prisma.product.findMany({
      where: { slug: { in: Object.keys(URUN) } },
      select: { id: true, slug: true, name: true, isActive: true, category: { select: { slug: true } } },
    });
    const bulunan = new Set(urunler.map((u) => u.slug));
    const eksik = Object.keys(URUN).filter((s) => !bulunan.has(s));

    console.log("Kategori ağacı:");
    for (const [i, a] of AGAC.entries()) {
      const n = Object.values(URUN).filter((s) => a.alt.some((k) => k.slug === s)).length;
      console.log(`  ${i + 1}. ${a.name} (${a.slug}) — ${n} ürün`);
      for (const k of a.alt) {
        const m = Object.values(URUN).filter((s) => s === k.slug).length;
        console.log(`       · ${k.name} — ${m}`);
      }
    }
    console.log("\nÜrün taşımaları:");
    for (const u of urunler) {
      console.log(`  ${u.name}: ${u.category.slug} → ${URUN[u.slug]}${u.isActive ? "" : "  (pasif ürün)"}`);
    }
    if (eksik.length) console.log(`\nVeritabanında bulunamayan (atlanır): ${eksik.join(", ")}`);
    console.log("\nKoleksiyonlar:");
    for (const k of KOLEKSIYON) console.log(`  ${k.name}: ${k.urunler.filter((s) => bulunan.has(s)).length} ürün`);

    if (!uygula) {
      console.log("\nPlan tamam. Uygulamak için --uygula ekleyin.");
      return;
    }

    await prisma.$transaction(async (tx) => {
      const altId = new Map<string, string>();
      for (const [i, a] of AGAC.entries()) {
        const ana = await tx.category.upsert({
          where: { slug: a.slug },
          update: { name: a.name, description: a.description, parentId: null, isActive: true, sortOrder: i + 1 },
          create: { slug: a.slug, name: a.name, description: a.description, isActive: true, sortOrder: i + 1 },
        });
        for (const [j, k] of a.alt.entries()) {
          const alt = await tx.category.upsert({
            where: { slug: k.slug },
            update: { name: k.name, parentId: ana.id, isActive: true, sortOrder: j + 1 },
            create: { slug: k.slug, name: k.name, parentId: ana.id, isActive: true, sortOrder: j + 1 },
          });
          altId.set(k.slug, alt.id);
        }
      }

      for (const u of urunler) {
        await tx.product.update({ where: { id: u.id }, data: { categoryId: altId.get(URUN[u.slug])! } });
      }

      const idOf = new Map(urunler.map((u) => [u.slug, u.id]));
      for (const k of KOLEKSIYON) {
        const tag = await tx.tag.upsert({
          where: { slug: k.slug },
          update: { name: k.name },
          create: { slug: k.slug, name: k.name },
        });
        const ids = k.urunler.map((s) => idOf.get(s)).filter((x): x is string => Boolean(x));
        await tx.productTag.createMany({
          data: ids.map((productId) => ({ productId, tagId: tag.id })),
          skipDuplicates: true,
        });
      }

      for (const slug of ESKI) {
        const c = await tx.category.findUnique({
          where: { slug },
          select: { id: true, _count: { select: { products: { where: { isActive: true } } } } },
        });
        if (!c) continue;
        if (c._count.products > 0) {
          console.log(`  ! ${slug}: içinde ${c._count.products} aktif ürün var, pasife alınmadı`);
          continue;
        }
        await tx.category.update({ where: { id: c.id }, data: { isActive: false } });
        console.log(`  ${slug} pasife alındı`);
      }
    }, {
      // ~70 sorgu tek transaction'da; Neon'a her biri ağ gidiş-dönüşü.
      // Varsayılan 5 sn canlıda yetmedi (5,2 sn'de düştü, her şey geri alındı).
      timeout: 120_000,
      maxWait: 20_000,
    });
    console.log("\nUygulandı.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
