import { prisma } from "@/lib/db";
import { HeroExperience, type HeroProduct } from "@/components/home/HeroExperience";
import { Hero } from "@/components/home/Hero";
import { AdjyMethod } from "@/components/home/AdjyMethod";
import { FeaturedObjects, type FeaturedObject } from "@/components/home/FeaturedObjects";
import { ConfiguratorShowcase } from "@/components/home/ConfiguratorShowcase";
import { SpaceShowcase, type SpaceScene } from "@/components/home/SpaceShowcase";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CollectionsStrip } from "@/components/home/CollectionsStrip";
import { CreateSection } from "@/components/home/CreateSection";
import { FinalCTA } from "@/components/home/FinalCTA";
import { SectionHeading } from "@/components/ui/section-heading";
import { WebSiteJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";
import { getProductType } from "@/lib/productType";
import type { HomeCategory } from "@/components/home/CategoryGrid";

// Ana sayfa vitrini veritabanından beslenir; statik kalırsa yeni ürünler
// ancak yeni bir deploy ile görünür. 5 dakikada bir tazelenir.
export const revalidate = 300;

// ==========================================
// ANA SAYFA
//
// Tek bir hikâye: nesne → tasarım → ölçü → mekân → üretim.
//
// 01/02  Hero + scroll anlatısı (gerçek parametrik model)
// 03     ADJY nedir — keşfet / yapılandır / üret
// 04     Öne çıkan nesneler
// 05     Parametrik konfigüratör (gerçek Parameter kayıtları)
// 06     Alanına göre
// 07     Nasıl çalışır
// 08     Koleksiyonlar
// 09     Kendi modelini üret + kapanış
//
// Veritabanına ulaşılamazsa her bölüm sessizce gizlenir;
// hiçbir sorgu sayfayı düşürmez.
// ==========================================

const CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  basePrice: true,
  thumbnailUrl: true,
  featured: true,
  materialType: true,
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { reviews: true, parameters: true } },
} as const;

async function getShowcaseProducts() {
  try {
    const featured = await prisma.product.findMany({
      where: { isActive: true, featured: true },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: CARD_SELECT,
    });

    let products = featured;
    if (products.length < 6) {
      const fillers = await prisma.product.findMany({
        where: { isActive: true, id: { notIn: products.map((p) => p.id) } },
        take: 6 - products.length,
        orderBy: { createdAt: "desc" },
        select: CARD_SELECT,
      });
      products = [...products, ...fillers];
    }

    return products.map((p) => ({ ...p, basePrice: Number(p.basePrice) }));
  } catch {
    return [];
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

async function getCategories(): Promise<HomeCategory[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { products: true } },
      },
    });

    return categories
      .filter((c) => c._count.products > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: null,
        productCount: c._count.products,
      }));
  } catch {
    return [];
  }
}

async function getConfigurableProduct() {
  try {
    const product = await prisma.product.findFirst({
      where: {
        isActive: true,
        parameters: { some: { minValue: { not: null }, maxValue: { not: null } } },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        thumbnailUrl: true,
        materialType: true,
        category: { select: { name: true } },
        parameters: {
          where: { minValue: { not: null }, maxValue: { not: null } },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            displayName: true,
            minValue: true,
            maxValue: true,
            defaultValue: true,
            step: true,
            unit: true,
          },
        },
      },
    });

    if (!product || product.parameters.length === 0) return null;
    return { ...product, basePrice: Number(product.basePrice) };
  } catch {
    return null;
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
          select: { minValue: true, maxValue: true, unit: true },
          take: 1,
        },
      },
    });

    // Kategori başına ilk ürün
    const seen = new Set<string>();
    const scenes: SpaceScene[] = [];
    for (const row of rows) {
      if (seen.has(row.category.slug)) continue;
      seen.add(row.category.slug);

      const param = row.parameters[0];
      const dimension =
        param && param.minValue !== null && param.maxValue !== null
          ? `${param.minValue} – ${param.maxValue} ${param.unit ?? "mm"}`
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
        dimension,
      });
      if (scenes.length === 4) break;
    }
    return scenes;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [showcaseProducts, heroProduct, categories, configurable, spaceScenes] =
    await Promise.all([
      getShowcaseProducts(),
      getHeroProduct(),
      getCategories(),
      getConfigurableProduct(),
      getSpaceScenes(),
    ]);

  const baseUrl = getAbsoluteUrl();
  const withImage = showcaseProducts.filter((p) => p.thumbnailUrl);

  const featuredObjects: FeaturedObject[] = showcaseProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    basePrice: p.basePrice,
    thumbnailUrl: p.thumbnailUrl,
    category: { name: p.category.name },
    isCustomizable: (p._count?.parameters ?? 0) > 0,
  }));

  const methodProducts = (withImage.length >= 3 ? withImage : showcaseProducts)
    .slice(0, 3)
    .map((p) => ({ name: p.name, slug: p.slug, thumbnailUrl: p.thumbnailUrl }));

  return (
    <>
      <WebSiteJsonLd
        name="ADJY — Parametrik 3D Baskı Nesneleri"
        url={baseUrl}
        description="Dijital olarak tasarlandı, senin ölçünle yapılandırıldı, alanına göre üretildi. Hazır nesneleri satın al ya da kendi modelini ürettir."
      />

      {/* 01 + 02 — Hero ve scroll anlatısı */}
      {heroProduct ? (
        <HeroExperience product={heroProduct} />
      ) : (
        <Hero product={withImage[0] ?? showcaseProducts[0] ?? null} />
      )}

      {/* 03 — ADJY nedir */}
      {methodProducts.length > 0 && <AdjyMethod products={methodProducts} />}

      {/* 04 — Öne çıkan nesneler */}
      {featuredObjects.length > 0 && <FeaturedObjects products={featuredObjects} />}

      {/* 05 — Parametrik konfigüratör */}
      {configurable && (
        <section
          className="border-y border-border bg-surface"
          aria-label="Parametrik konfigüratör"
        >
          <div className="adjy-container adjy-section">
            <SectionHeading
              eyebrow="Yapılandır"
              title="Senin ölçün."
              description="Tek tasarım, senin boyutların. Ölçüyü buradan denemeye başla; 3D önizleme ve fiyat konfigüratörde devralır."
              className="mb-12 md:mb-16"
            />
            <ConfiguratorShowcase product={configurable} />
          </div>
        </section>
      )}

      {/* 06 — Alanına göre */}
      <SpaceShowcase scenes={spaceScenes} />

      {/* 07 — Nasıl çalışır */}
      <section className="adjy-container adjy-section" aria-label="Nasıl çalışır">
        <SectionHeading
          eyebrow="Süreç"
          title="Sipariş sonrası"
          className="mb-10 md:mb-14"
        />
        <HowItWorks />
      </section>

      {/* 08 — Koleksiyonlar */}
      <CollectionsStrip categories={categories} />

      {/* 09 — Kendi modelini üret + kapanış */}
      <CreateSection />
      <FinalCTA />
    </>
  );
}
