import { prisma } from "@/lib/db";
import { HeroExperience, type HeroProduct } from "@/components/home/HeroExperience";
import { Hero } from "@/components/home/Hero";
import { ObjectStory, type ObjectStoryProduct } from "@/components/home/ObjectStory";
import { FeaturedObjects, type FeaturedObject } from "@/components/home/FeaturedObjects";
import { ConfiguratorShowcase } from "@/components/home/ConfiguratorShowcase";
import { SpaceShowcase, type SpaceScene } from "@/components/home/SpaceShowcase";
import { DigitalToPhysical } from "@/components/home/DigitalToPhysical";
import { CreateSection } from "@/components/home/CreateSection";
import { ExploreShop, type ShopTeaserProduct } from "@/components/home/ExploreShop";
import { FinalCTA } from "@/components/home/FinalCTA";
import { ProductRail, type RailProduct } from "@/components/product/ProductRail";
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

/**
 * "Bir nesnenin üç hâli" anlatısının kahramanı.
 * Delikli duvar paneli seçilir: modüler sistemi olan tek ürün,
 * yani keşfet → yapılandır → üret hikâyesini tek başına taşıyabilen nesne.
 */
async function getStoryProduct(): Promise<ObjectStoryProduct | null> {
  try {
    const panel = await prisma.product.findFirst({
      where: {
        isActive: true,
        OR: [{ slug: { contains: "delikli" } }, { slug: { contains: "panel" } }],
      },
      select: { id: true, name: true, slug: true, thumbnailUrl: true },
    });
    if (panel) return panel;

    // Panel yoksa anlatı yine kurulsun diye görseli olan herhangi bir ürün
    return await prisma.product.findFirst({
      where: { isActive: true, thumbnailUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, slug: true, thumbnailUrl: true },
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

const RAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  thumbnailUrl: true,
  createdAt: true,
  category: { select: { name: true } },
  _count: { select: { parameters: true } },
} as const;

/**
 * Eski fiyatlar (compareAtPrice) ayrı sorguda okunur.
 *
 * Nedeni: bu kolon bir migration ile geliyor. Kolon henüz
 * uygulanmamışsa onu SEÇEN her sorgu patlar ve öne çıkan
 * ürünler, yeni gelenler gibi bölümler topluca boşalırdı.
 * Ayrı tutulunca en kötü ihtimalle yalnızca indirim bilgisi
 * eksik kalır; migration çalıştığı an kod değişmeden devreye girer.
 */
async function getCompareAtPrices(): Promise<Map<string, number>> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, compareAtPrice: { not: null } },
      select: { id: true, compareAtPrice: true },
    });
    return new Map(
      rows
        .filter((r) => r.compareAtPrice !== null)
        .map((r) => [r.id, Number(r.compareAtPrice)])
    );
  } catch {
    // Kolon yok ya da erişilemedi — indirim gösterilmez, gerisi çalışır
    return new Map();
  }
}

/** Son 30 günde eklenen ürün "yeni" sayılır */
const NEW_WINDOW_DAYS = 30;

function toRailProduct(
  p: {
    id: string;
    name: string;
    slug: string;
    basePrice: unknown;
    thumbnailUrl: string | null;
    createdAt: Date;
    category: { name: string };
    _count: { parameters: number };
  },
  markNew: boolean,
  compareAt: number | null
): RailProduct {
  const cutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    basePrice: Number(p.basePrice),
    compareAtPrice: compareAt,
    thumbnailUrl: p.thumbnailUrl,
    category: p.category,
    isNew: markNew && p.createdAt.getTime() > cutoff,
    isCustomizable: p._count.parameters > 0,
  };
}

/** Yeni gelenler — en son eklenen nesneler */
async function getNewArrivals(compareAt: Map<string, number>): Promise<RailProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: RAIL_SELECT,
    });
    return rows.map((p) => toRailProduct(p, true, compareAt.get(p.id) ?? null));
  } catch {
    return [];
  }
}

/**
 * Seçili ürünler — eski fiyatı güncel fiyattan yüksek olanlar.
 * Hiç indirimli ürün yoksa bölüm kendini gizler; boş bir
 * "İndirimler" başlığı göstermek güven kırar.
 */
async function getDiscounted(compareAt: Map<string, number>): Promise<RailProduct[]> {
  if (compareAt.size === 0) return [];
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, id: { in: [...compareAt.keys()] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: RAIL_SELECT,
    });
    return rows
      .filter((p) => (compareAt.get(p.id) ?? 0) > Number(p.basePrice))
      .map((p) => toRailProduct(p, false, compareAt.get(p.id) ?? null));
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
  // Eski fiyatlar önce okunur: kolon yoksa boş harita döner ve
  // yalnızca indirim bilgisi eksik kalır, diğer bölümler etkilenmez.
  const compareAt = await getCompareAtPrices();

  const [
    featuredObjects,
    heroProduct,
    storyProduct,
    configuratorProducts,
    spaceScenes,
    shopTeaser,
    newArrivals,
    discounted,
  ] = await Promise.all([
      getFeaturedObjects(),
      getHeroProduct(),
      getStoryProduct(),
      getConfiguratorProducts(),
      getSpaceScenes(),
      getShopTeaser(),
      getNewArrivals(compareAt),
      getDiscounted(compareAt),
    ]);

  const baseUrl = getAbsoluteUrl();
  const withImage = featuredObjects.filter((p) => p.thumbnailUrl);

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

      {/* 02 — Bir nesnenin üç hâli: keşfet → yapılandır → üret */}
      {storyProduct && <ObjectStory product={storyProduct} />}

      {/* 03 — Öne çıkan nesneler */}
      {featuredObjects.length > 0 && <FeaturedObjects products={featuredObjects} />}

      {/* 04 — Seninki yap */}
      {configuratorProducts.length > 0 && (
        <section
          className="border-y border-border bg-surface"
          aria-label="Nesneyi yapılandır"
        >
          <div className="adjy-container adjy-section">
            <SectionHeading
              eyebrow="Yapılandır"
              title="Seninki yap."
              description="Kaydırıcıyı oynat, nesne gerçekten değişsin. Tek tasarım, senin ölçülerin."
              action={{ label: "Tüm yapılandırılabilir nesneler", href: "/configure" }}
              className="mb-12 md:mb-16"
            />
            <ConfiguratorShowcase products={configuratorProducts} />
          </div>
        </section>
      )}

      {/* 05 — Yeni gelenler */}
      {newArrivals.length > 0 && (
        <section className="adjy-container adjy-section" aria-label="Yeni gelenler">
          <SectionHeading
            eyebrow="Yeni"
            title="Yeni gelenler"
            description="Katalogdaki en son nesneler."
            action={{ label: "Tüm nesneler", href: "/products?sort=newest" }}
            className="mb-10 md:mb-12"
          />
          <ProductRail products={newArrivals} />
        </section>
      )}

      {/* 06 — Alanına göre */}
      <SpaceShowcase scenes={spaceScenes} />

      {/* 07 — Seçili ürünler (indirimliler) */}
      {discounted.length > 0 && (
        <section
          className="border-y border-border bg-surface"
          aria-label="Seçili ürünler"
        >
          <div className="adjy-container adjy-section">
            <SectionHeading
              eyebrow="Seçili ürünler"
              title="Şimdi daha uygun."
              description="Eski fiyatı üstü çizili gösterilen nesneler."
              className="mb-10 md:mb-12"
            />
            <ProductRail products={discounted} />
          </div>
        </section>
      )}

      {/* 08 — Dijitalden fiziksele */}
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
