import { prisma } from "@/lib/db";
import { HeroExperience, type HeroProduct } from "@/components/home/HeroExperience";
import { Hero } from "@/components/home/Hero";
import { AdjyMethod } from "@/components/home/AdjyMethod";
import { FeaturedObjects, type FeaturedObject } from "@/components/home/FeaturedObjects";
import { ConfiguratorShowcase } from "@/components/home/ConfiguratorShowcase";
import { SpaceShowcase, type SpaceScene } from "@/components/home/SpaceShowcase";
import { DigitalToPhysical } from "@/components/home/DigitalToPhysical";
import { CreateSection } from "@/components/home/CreateSection";
import { ExploreShop, type ShopTeaserProduct } from "@/components/home/ExploreShop";
import { FinalCTA } from "@/components/home/FinalCTA";
import { SectionHeading } from "@/components/ui/section-heading";
import { WebSiteJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";
import { getProductType } from "@/lib/productType";

// Vitrin veritabanından beslenir; statik kalırsa yeni ürünler ancak
// yeni bir deploy ile görünür. 5 dakikada bir tazelenir.
export const revalidate = 300;

// ==========================================
// ANA SAYFA — KATALOG DEĞİL, HİKÂYE
//
// Ziyaretçi sırayla şunu düşünmeli:
//   "İlginç nesneler." →
//   "Bunları değiştirebiliyor muyum?" →
//   "Ben de bir tane yapılandırayım." →
//   "Benimki kaça gelir?"
//
// Yerleşim:
//   01  Hero + scroll anlatısı (gerçek parametrik model)
//   02  Keşfet / Yapılandır / Üret
//   03  Öne çıkan nesneler (3-4 tane, katalog değil)
//   04  Seninki yap — gerçek konfigüratör teaser'ı
//   05  Alanına göre
//   06  Dijitalden fiziksele
//   07  Üret — kendi modelini ürettir
//   08  Mağazaya geçiş
//   09  Kapanış
//
// Ana sayfa her şeyi göstermez: merak uyandırıp derinlere yollar.
// Veritabanına ulaşılamazsa bölümler sessizce gizlenir.
// ==========================================

const CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  basePrice: true,
  thumbnailUrl: true,
  featured: true,
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { reviews: true, parameters: true } },
} as const;

/** Öne çıkan nesneler — ana sayfada yalnızca 4 tane */
async function getFeaturedObjects(): Promise<FeaturedObject[]> {
  try {
    const featured = await prisma.product.findMany({
      where: { isActive: true, featured: true },
      take: 4,
      orderBy: { createdAt: "desc" },
      select: CARD_SELECT,
    });

    let rows = featured;
    if (rows.length < 4) {
      const fillers = await prisma.product.findMany({
        where: {
          isActive: true,
          thumbnailUrl: { not: null },
          id: { notIn: rows.map((p) => p.id) },
        },
        take: 4 - rows.length,
        orderBy: { createdAt: "desc" },
        select: CARD_SELECT,
      });
      rows = [...rows, ...fillers];
    }

    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      basePrice: Number(p.basePrice),
      thumbnailUrl: p.thumbnailUrl,
      category: { name: p.category.name },
      isCustomizable: p._count.parameters > 0,
    }));
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

/** Mağaza geçişi: küçük vitrin + katalog büyüklüğü */
async function getShopTeaser(): Promise<{
  products: ShopTeaserProduct[];
  total: number;
}> {
  try {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        take: 6,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        select: { id: true, name: true, slug: true, thumbnailUrl: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
    ]);
    return { products: rows, total };
  } catch {
    return { products: [], total: 0 };
  }
}

export default async function HomePage() {
  const [featuredObjects, heroProduct, configurable, spaceScenes, shopTeaser] =
    await Promise.all([
      getFeaturedObjects(),
      getHeroProduct(),
      getConfigurableProduct(),
      getSpaceScenes(),
      getShopTeaser(),
    ]);

  const baseUrl = getAbsoluteUrl();
  const withImage = featuredObjects.filter((p) => p.thumbnailUrl);

  const methodProducts = (withImage.length >= 3 ? withImage : featuredObjects)
    .slice(0, 3)
    .map((p) => ({ name: p.name, slug: p.slug, thumbnailUrl: p.thumbnailUrl }));

  return (
    <>
      <WebSiteJsonLd
        name="ADJY — Dijital tasarlanmış, senin ölçünde üretilen nesneler"
        url={baseUrl}
        description="Hazır nesneleri satın al ya da ölçüsünü kendin belirleyip ürettir. Dijital olarak tasarlandı, senin tarafından yapılandırıldı, alanına göre üretildi."
      />

      {/* 01 — Hero ve scroll anlatısı */}
      {heroProduct ? (
        <HeroExperience product={heroProduct} />
      ) : (
        <Hero
          product={
            withImage[0]
              ? {
                  name: withImage[0].name,
                  slug: withImage[0].slug,
                  thumbnailUrl: withImage[0].thumbnailUrl,
                  category: withImage[0].category,
                }
              : null
          }
        />
      )}

      {/* 02 — Keşfet / Yapılandır / Üret */}
      {methodProducts.length > 0 && <AdjyMethod products={methodProducts} />}

      {/* 03 — Öne çıkan nesneler */}
      {featuredObjects.length > 0 && <FeaturedObjects products={featuredObjects} />}

      {/* 04 — Seninki yap */}
      {configurable && (
        <section
          className="border-y border-border bg-surface"
          aria-label="Nesneyi yapılandır"
        >
          <div className="adjy-container adjy-section">
            <SectionHeading
              eyebrow="Yapılandır"
              title="Seninki yap."
              description="Tek tasarım. Senin ölçülerin. Senin konfigürasyonun. Aşağıdan denemeye başla; 3D önizleme ve fiyat konfigüratörde devralır."
              action={{ label: "Tüm yapılandırılabilir nesneler", href: "/configure" }}
              className="mb-12 md:mb-16"
            />
            <ConfiguratorShowcase product={configurable} />
          </div>
        </section>
      )}

      {/* 05 — Alanına göre */}
      <SpaceShowcase scenes={spaceScenes} />

      {/* 06 — Dijitalden fiziksele */}
      <DigitalToPhysical />

      {/* 07 — Üret: kendi modelini ürettir */}
      <CreateSection />

      {/* 08 — Mağazaya geçiş */}
      <ExploreShop products={shopTeaser.products} totalCount={shopTeaser.total} />

      {/* 09 — Kapanış */}
      <FinalCTA />
    </>
  );
}
