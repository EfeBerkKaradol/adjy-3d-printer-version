import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { HeroExperience, type HeroProduct } from "@/components/home/HeroExperience";
import { Hero } from "@/components/home/Hero";
import { ProductCinemaLoader } from "@/components/home/cinema/ProductCinemaLoader";
import type { CinemaProduct } from "@/components/home/cinema/ProductCinema";
import { ConfiguratorShowcase } from "@/components/home/ConfiguratorShowcase";
import { SpaceShowcase, type SpaceScene } from "@/components/home/SpaceShowcase";
import { DigitalToPhysical } from "@/components/home/DigitalToPhysical";
import { PhotoToProductTeaser } from "@/components/home/PhotoToProductTeaser";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProductType } from "@/lib/productType";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "ADJY; 3D baskı, seramik ve alçı dekoratif ürünler üretir. Ölçüsünü değiştirebildiğin nesneler, kendi atölyemizden.",
};

// ==========================================
// HAKKIMIZDA
//
// Sayfa yalnızca 3D baskıdan söz ediyordu; ADJY seramik ve
// alçı dekoratif ürünler de üretiyor. Metin bu yüzden
// malzemeye değil, yapılan işe göre yazıldı — teknoloji
// değişse bile doğru kalır.
//
// Ana sayfadaki anlatı bölümleri de buraya taşındı. Orada
// mağazanın önünü kapatıyorlardı: gelen kişi ürün görmeden
// sayfalarca kaydırıyor, burasının bir mağaza olduğunu
// anlamadan ayrılıyordu. Bizi merak eden buraya geliyor —
// anlatının yeri burası.
//
// Tipografi ve hitap sitenin geri kalanıyla aynı: sola
// hizalı editoryal düzen, "sen" dili.
// ==========================================

const REASONS = [
  {
    title: "Ölçüsü sana göre",
    body: "Çoğu nesnenin ölçüsünü kendi alanına göre değiştirip ürettirebilirsin.",
  },
  {
    title: "Almadan önce gör",
    body: "Nesneyi telefonunla kendi odanda, gerçek ölçüsünde görüntüleyebilirsin.",
  },
  {
    title: "Birden fazla malzeme",
    body: "3D baskı (PLA, PETG, ABS), seramik ve alçı — işe uygun olanı seçiyoruz.",
  },
  {
    title: "Kendi atölyemiz",
    body: "Üretim bizde olduğu için tek parçalık siparişi de aynı özenle yapıyoruz.",
  },
];

const STEPS = [
  { n: "01", title: "Seç ya da kur", body: "Hazır bir nesneyi al ya da ölçüsünü kendin belirle." },
  { n: "02", title: "Üretim", body: "Nesneye göre 3D baskı, seramik ya da alçı ile üretiyoruz." },
  { n: "03", title: "Kontrol", body: "Her parça elden geçer, kusurlu olan yola çıkmaz." },
  { n: "04", title: "Teslimat", body: "Kırılabilir parçalar ayrı korumayla paketlenir." },
];

/**
 * "Bir nesnenin üç hâli" anlatısının kahramanı.
 * Delikli duvar paneli seçilir: modüler sistemi olan tek ürün,
 * yani keşfet → yapılandır → üret hikâyesini tek başına taşıyabilen nesne.
 */
async function getStoryProduct(): Promise<CinemaProduct | null> {
  try {
    const panel = await prisma.product.findFirst({
      where: {
        isActive: true,
        OR: [{ slug: { contains: "delikli" } }, { slug: { contains: "panel" } }],
      },
      select: { id: true, name: true, slug: true },
    });
    if (panel) return panel;

    // Panel yoksa anlatı yine kurulsun diye görseli olan herhangi bir ürün
    return await prisma.product.findFirst({
      where: { isActive: true, thumbnailUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, slug: true },
    });
  } catch {
    return null;
  }
}



/** Hero: scroll ile sürülebilmesi için "width" parametresi olan bir ürün */
async function getHeroProduct(): Promise<HeroProduct | null> {
  try {
    const product = await prisma.product.findFirst({
      where: {
        isActive: true,
        parameters: {
          some: { name: "width", minValue: { not: null }, maxValue: { not: null } },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        thumbnailUrl: true,
        category: { select: { name: true } },
        parameters: {
          where: { name: "width" },
          select: { minValue: true, maxValue: true, defaultValue: true },
          take: 1,
        },
      },
    });

    const width = product?.parameters[0];
    if (!product || !width || width.minValue === null || width.maxValue === null) {
      return null;
    }
    if (width.maxValue <= width.minValue) return null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      thumbnailUrl: product.thumbnailUrl,
      productType: getProductType(product.slug),
      category: product.category,
      widthRange: {
        min: width.minValue,
        max: width.maxValue,
        default: Number(width.defaultValue) || width.minValue,
      },
    };
  } catch {
    return null;
  }
}



/** Ana sayfa konfigüratörü: ölçüsü değişebilen 4 nesne */
async function getConfiguratorProducts() {
  try {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        parameters: {
          some: { type: "SLIDER", minValue: { not: null }, maxValue: { not: null } },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        thumbnailUrl: true,
        modelFileUrl: true,
        materialType: true,
        category: { select: { name: true } },
        parameters: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            minValue: true,
            maxValue: true,
            defaultValue: true,
            step: true,
            unit: true,
          },
        },
      },
    });

    return rows.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      productType: getProductType(p.slug),
    }));
  } catch {
    return [];
  }
}



/** "Alanına göre" sekmeleri: her kategoriden görseli olan bir ürün */
async function getSpaceScenes(): Promise<SpaceScene[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        name: true,
        slug: true,
        thumbnailUrl: true,
        category: { select: { name: true, slug: true } },
        parameters: {
          where: {
            type: "SLIDER",
            minValue: { not: null },
            maxValue: { not: null },
          },
          orderBy: { sortOrder: "asc" },
          select: {
            displayName: true,
            minValue: true,
            maxValue: true,
            defaultValue: true,
          },
          take: 1,
        },
      },
    });

    const seen = new Set<string>();
    const scenes: SpaceScene[] = [];
    for (const row of rows) {
      if (seen.has(row.category.slug)) continue;
      seen.add(row.category.slug);

      // Ölçek çizimi yalnızca gerçek bir aralık varsa çizilir
      const param = row.parameters[0];
      const width =
        param &&
        param.minValue !== null &&
        param.maxValue !== null &&
        param.maxValue > param.minValue
          ? {
              min: param.minValue,
              max: param.maxValue,
              default: Number(param.defaultValue) || param.minValue,
              label: param.displayName,
            }
          : null;

      scenes.push({
        label: row.category.name,
        categoryName: row.category.name,
        categorySlug: row.category.slug,
        product: {
          name: row.name,
          slug: row.slug,
          thumbnailUrl: row.thumbnailUrl,
        },
        width,
      });
      if (scenes.length === 4) break;
    }
    return scenes;
  } catch {
    return [];
  }
}

export default async function AboutPage() {
  const [heroProduct, storyProduct, configuratorProducts, spaceScenes] = await Promise.all([
    getHeroProduct(),
    getStoryProduct(),
    getConfiguratorProducts(),
    getSpaceScenes(),
  ]);

  return (
    <>
    <div className="adjy-container adjy-section">
      <header className="max-w-2xl">
        <p className="adjy-eyebrow mb-5">Hakkımızda</p>
        <h1 className="adjy-display text-[clamp(1.9rem,4.2vw,3rem)]">
          Tasarımı nesneye çeviriyoruz.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          ADJY; 3D baskı, seramik ve alçı ile dekoratif ve işlevsel nesneler üretir.
          Çoğunu hazır alabilir, bir kısmının ölçüsünü kendi alanına göre
          değiştirip ürettirebilirsin.
        </p>
      </header>

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-xl font-medium tracking-tight">Neden ADJY?</h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {REASONS.map((r) => (
            <div key={r.title} className="bg-background p-6">
              <h3 className="text-[15px] font-medium tracking-tight">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-xl font-medium tracking-tight">Nasıl üretiyoruz?</h2>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-background p-6">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{s.n}</span>
              <h3 className="mt-6 text-[15px] font-medium tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 border-t border-border pt-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-xl font-medium tracking-tight">Aklında bir şey mi var?</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Kendi modelini ürettirebilir ya da bir fotoğraftan yeni bir nesne
              oluşturabilirsin.
            </p>
          </div>
          <Link
            href="/uret"
            className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
          >
            Üret
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </section>
    </div>

      {/* Anlatı: bir nesnenin keşiften üretime yolculuğu */}
      <section className="mt-20 border-t border-border/60 pt-4">
        {heroProduct ? <HeroExperience product={heroProduct} /> : <Hero product={null} />}
      </section>

      <ProductCinemaLoader product={storyProduct} />

      {configuratorProducts.length > 0 && (
        <section className="adjy-container adjy-section border-t border-border/60">
          <SectionHeading
            eyebrow="Seninki"
            title="Ölçüsünü sen seç"
            action={{ label: "Yapılandır", href: "/configure" }}
          />
          <div className="mt-8">
            <ConfiguratorShowcase products={configuratorProducts} />
          </div>
        </section>
      )}

      <SpaceShowcase scenes={spaceScenes} />
      <DigitalToPhysical />
      <PhotoToProductTeaser />
    </>
  );
}
