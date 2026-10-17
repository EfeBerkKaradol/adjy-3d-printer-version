import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { StoreHero, type HeroCard } from "@/components/home/StoreHero";
import { TrustRow } from "@/components/home/TrustRow";
import { CategoryGrid, type HomeCategory } from "@/components/home/CategoryGrid";
import { CreateSection } from "@/components/home/CreateSection";
import { ProductRail, type RailProduct } from "@/components/product/ProductRail";
import { SectionHeading } from "@/components/ui/section-heading";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";

// Vitrin veritabanından beslenir; statik kalırsa yeni ürünler ancak
// yeni bir deploy ile görünür. 5 dakikada bir tazelenir.
export const revalidate = 300;

// ==========================================
// ANA SAYFA — MAĞAZA
//
// Burası önce bir manifestoydu: "Nesneler, yeniden" ve altında
// sayfalarca anlatı. Güzeldi ama ilk ekranda tek bir ürün, tek
// bir fiyat yoktu; gelen kişi burasının bir mağaza olduğunu
// anlamadan ayrılıyordu. O anlatı artık Hakkımızda'da duruyor —
// bizi merak edene orada anlatılır.
//
// Yerleşim, ziyaretçinin sırayla sorduğu sorulara göre:
//   Ne satıyorsunuz?   → karşılama, üç gerçek ürün ve fiyatları
//   Size niye güveneyim? → güven şeridi
//   Nelerin var?       → kategoriler (kataloğun genişliği)
//   En iyileri?        → öne çıkanlar
//   Sizi ayıran ne?    → ölçüsü değişen nesneler
//   Yeni ne var?       → yeni gelenler
//   Kendi modelim?     → üret
//
// Veritabanına ulaşılamazsa bölümler sessizce gizlenir; yarım
// bir sayfa, hata sayfasından iyidir.
// ==========================================

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

/** Son 30 günde eklenen ürün "yeni" sayılır */
const NEW_WINDOW_DAYS = 30;

/**
 * Eski fiyatlar (compareAtPrice) ayrı sorguda okunur.
 *
 * Nedeni: bu kolon bir migration ile geliyor. Kolon henüz
 * uygulanmamışsa onu SEÇEN her sorgu patlar ve öne çıkan
 * ürünler, yeni gelenler gibi bölümler topluca boşalırdı.
 * Ayrı tutulunca en kötü ihtimalle yalnızca indirim bilgisi
 * eksik kalır.
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
    return new Map();
  }
}

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

/** Karşılamadaki üç kare: görseli olan, öne çıkarılmış nesneler */
async function getHeroCards(): Promise<{ products: HeroCard[]; total: number }> {
  try {
    const [featured, total] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, thumbnailUrl: { not: null } },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          thumbnailUrl: true,
          category: { select: { name: true } },
          _count: { select: { parameters: true } },
        },
      }),
      prisma.product.count({ where: { isActive: true } }),
    ]);
    return {
      products: featured.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        basePrice: Number(p.basePrice),
        thumbnailUrl: p.thumbnailUrl,
        category: p.category,
        isCustomizable: p._count.parameters > 0,
      })),
      total,
    };
  } catch {
    return { products: [], total: 0 };
  }
}

/**
 * Kategoriler — kataloğun genişliğini ilk ekranda göstermek için.
 *
 * Tek ürünlü kategoriler dışarıda bırakılır: tıklayıp boş bir
 * raf bulmak, o kategoriyi hiç görmemekten kötü.
 */
const MIN_KATEGORI_URUN = 3;

async function getCategories(): Promise<HomeCategory[]> {
  try {
    const rows = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
    return rows
      .filter((c) => c._count.products >= MIN_KATEGORI_URUN)
      .sort((a, b) => b._count.products - a._count.products)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c._count.products,
      }));
  } catch {
    return [];
  }
}

async function getFeaturedRail(compareAt: Map<string, number>): Promise<RailProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: RAIL_SELECT,
    });
    return rows.map((p) => toRailProduct(p, true, compareAt.get(p.id) ?? null));
  } catch {
    return [];
  }
}

/** Bizi ayıran raf: ölçüsü müşteriye göre değişen nesneler */
async function getCustomizableRail(compareAt: Map<string, number>): Promise<RailProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null }, parameters: { some: {} } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: RAIL_SELECT,
    });
    return rows.map((p) => toRailProduct(p, false, compareAt.get(p.id) ?? null));
  } catch {
    return [];
  }
}

async function getNewArrivals(compareAt: Map<string, number>): Promise<RailProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: RAIL_SELECT,
    });
    return rows.map((p) => toRailProduct(p, true, compareAt.get(p.id) ?? null));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const compareAt = await getCompareAtPrices();
  const [hero, categories, featured, customizable, newArrivals] = await Promise.all([
    getHeroCards(),
    getCategories(),
    getFeaturedRail(compareAt),
    getCustomizableRail(compareAt),
    getNewArrivals(compareAt),
  ]);

  return (
    <>
      <OrganizationJsonLd url={getAbsoluteUrl()} />
      <WebSiteJsonLd
        name="ADJY"
        url={getAbsoluteUrl()}
        description="Ölçüsünü senin seçtiğin tasarım nesneleri: vazo, saksı, aydınlatma, masa düzeni ve dekoratif figürler. 3D baskı, seramik ve alçı."
      />

      <StoreHero products={hero.products} totalCount={hero.total} />
      <TrustRow />

      {categories.length > 0 && (
        <section className="adjy-container adjy-section">
          <SectionHeading
            eyebrow="Kategoriler"
            title="Neye bakıyorsun?"
            action={{ label: "Tüm nesneler", href: "/products" }}
          />
          <div className="mt-8">
            <CategoryGrid categories={categories} />
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="adjy-container adjy-section border-t border-border/60">
          <SectionHeading
            eyebrow="Öne çıkanlar"
            title="Çok sevilen nesneler"
            action={{ label: "Hepsini gör", href: "/products" }}
          />
          <div className="mt-8">
            <ProductRail products={featured} />
          </div>
        </section>
      )}

      {customizable.length > 0 && (
        <section className="adjy-container adjy-section border-t border-border/60">
          <SectionHeading
            eyebrow="Ölçüsü sana göre"
            title="Rafına, masana, pencerene göre"
            action={{ label: "Yapılandır", href: "/configure" }}
          />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Bu nesnelerin enini ve boyunu sen seçiyorsun. Ölçüyü değiştirdiğinde
            fiyat da anında güncellenir — sürprizle karşılaşmazsın.
          </p>
          <div className="mt-8">
            <ProductRail products={customizable} />
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="adjy-container adjy-section border-t border-border/60">
          <SectionHeading
            eyebrow="Yeni gelenler"
            title="Atölyeden yeni çıkanlar"
            action={{ label: "Tümü", href: "/products?sort=newest" }}
          />
          <div className="mt-8">
            <ProductRail products={newArrivals} />
          </div>
        </section>
      )}

      <CreateSection />

      <section className="border-t border-border/60">
        <div className="adjy-container flex flex-col gap-5 py-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="adjy-display text-[clamp(1.4rem,2.6vw,2rem)]">
              ADJY nasıl çalışır?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Nesneleri nasıl tasarladığımızı, hangi malzemeyle ürettiğimizi ve
              ölçünün neden değişebildiğini anlattık.
            </p>
          </div>
          <Link
            href="/about"
            className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
          >
            Hakkımızda
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </section>
    </>
  );
}
