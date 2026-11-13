import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { PrinterIntro } from "@/components/home/printer/PrinterIntro";
import { HAND_DRAWN, PRINTABLES, type PrintItem } from "@/components/home/printer/catalog";
import { kindForCategory } from "@/components/home/printer/sprites";
import { formatTRY } from "@/lib/slicer";
import { PromoBand } from "@/components/home/PromoBand";
import { CustomerVoices, type Soz } from "@/components/home/CustomerVoices";
import { TrustRow } from "@/components/home/TrustRow";
import { CategoryGrid, type HomeCategory } from "@/components/home/CategoryGrid";
import { loadCategoryTree } from "@/lib/categoryTree";
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
//   Burası ne?         → atölye: ürünlerimizi basan piksel yazıcı
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

/** Ölçüsü değişen ürün sayısı (ara banttaki "N ürün" için) */
async function getCustomizableCount(): Promise<number> {
  try {
    return await prisma.product.count({ where: { isActive: true, parameters: { some: {} } } });
  } catch {
    return 0;
  }
}

/**
 * Karşılamadaki piksel yazıcının bastığı ürünler: mağazadaki bütün
 * aktif ürünler (sırayı yazıcı rastgele seçer). Her ürünün piksel
 * hâli kategorisinden türetilir. Veritabanına ulaşılamazsa koddaki
 * altı ürünle devam edilir — animasyon her durumda oynar.
 */
async function getPrintables(): Promise<PrintItem[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        slug: true,
        name: true,
        basePrice: true,
        category: { select: { slug: true, parent: { select: { slug: true } } } },
      },
    });
    if (rows.length > 0) {
      return rows.map((r) => ({
        key:
          HAND_DRAWN[r.slug] ??
          `${kindForCategory([r.category.slug, r.category.parent?.slug, r.slug])}:${r.slug}`,
        name: r.name,
        href: `/products/${r.slug}`,
        price: formatTRY(Number(r.basePrice)),
      }));
    }
  } catch {
    // sessizce koddaki ürünlerle devam
  }
  return PRINTABLES.map((p) => ({
    key: p.key,
    name: p.fallbackName,
    href: `/products?category=${p.categorySlug}`,
    price: null,
  }));
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
    // Ana kategoriler; sayıya alt kategorilerdeki ürünler de girer
    const rows = await loadCategoryTree(prisma);
    return rows
      .filter((c) => c.productCount >= MIN_KATEGORI_URUN)
      .sort((a, b) => b.productCount - a.productCount)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c.productCount,
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

/**
 * Ara banttaki nesne: ölçü aralığı en geniş olan. Aralığı dar
 * bir üründe "ölçüsünü sen seç" sözü zayıf kalıyor.
 */
async function getPromoProduct() {
  try {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        thumbnailUrl: { not: null },
        parameters: { some: { name: "width", minValue: { not: null }, maxValue: { not: null } } },
      },
      select: {
        name: true,
        slug: true,
        thumbnailUrl: true,
        parameters: {
          where: { name: "width" },
          select: { minValue: true, maxValue: true },
          take: 1,
        },
      },
      take: 40,
    });

    const uygun = rows
      .map((p) => ({
        name: p.name,
        slug: p.slug,
        thumbnailUrl: p.thumbnailUrl,
        minMm: p.parameters[0]?.minValue ?? 0,
        maxMm: p.parameters[0]?.maxValue ?? 0,
      }))
      .filter((p) => p.maxMm > p.minMm && p.minMm > 0)
      .sort((a, b) => b.maxMm - b.minMm - (a.maxMm - a.minMm));

    return uygun[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Müşteri sözleri — yalnızca gerçekten sipariş vermiş kişilerden.
 *
 * Veritabanında kurulum sırasında bırakılmış deneme yorumları
 * var; bunlar ürünü satın almamış hesaplardan geliyor ve artık
 * katalogda olmayan ürünlere yazılmış. Sahte övgü yayımlamamak
 * için koşul yoruma değil, siparişe bakıyor.
 */
async function getCustomerVoices(): Promise<{ sozler: Soz[]; ortalama: number }> {
  try {
    const rows = await prisma.review.findMany({
      where: {
        rating: { gte: 4 },
        comment: { not: null },
        product: { isActive: true },
        user: { orders: { some: { status: { not: "CANCELLED" } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        user: { select: { fullName: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
    });

    const sozler: Soz[] = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment ?? "",
      // Soyadı kısaltılır: değerlendirme gerçek ama kimlik değil
      author: (r.user.fullName ?? r.user.email.split("@")[0])
        .split(" ")
        .map((p, i, a) => (i === a.length - 1 && a.length > 1 ? `${p[0]}.` : p))
        .join(" "),
      productName: r.product.name,
      productSlug: r.product.slug,
    }));

    const ortalama =
      sozler.length > 0
        ? sozler.reduce((t, s) => t + s.rating, 0) / sozler.length
        : 0;
    return { sozler, ortalama };
  } catch {
    return { sozler: [], ortalama: 0 };
  }
}

export default async function HomePage() {
  const compareAt = await getCompareAtPrices();
  const [customizableCount, categories, featured, customizable, newArrivals, promo, sesler, printables] =
    await Promise.all([
      getCustomizableCount(),
      getCategories(),
      getFeaturedRail(compareAt),
      getCustomizableRail(compareAt),
      getNewArrivals(compareAt),
      getPromoProduct(),
      getCustomerVoices(),
      getPrintables(),
    ]);

  return (
    <>
      <OrganizationJsonLd url={getAbsoluteUrl()} />
      <WebSiteJsonLd
        name="ADJY"
        url={getAbsoluteUrl()}
        description="İstediğiniz ölçüde tasarım ürünleri: vazo, saksı, aydınlatma, masa düzeni ve dekoratif figürler. Kendi atölyemizde 3D baskı, seramik ve alçı ile üretiyoruz."
      />

      <PrinterIntro items={printables} />

      {categories.length > 0 && (
        // id: karşılamadaki "Kaydır" bağlantısı buraya iner
        <section id="vitrin" className="adjy-container adjy-section scroll-mt-24">
          <SectionHeading
            eyebrow="Kategoriler"
            title="Ne arıyorsunuz?"
            action={{ label: "Tüm ürünler", href: "/products" }}
          />
          <div className="mt-8">
            <CategoryGrid categories={categories} limit={4} />
          </div>
        </section>
      )}

      <TrustRow />

      {featured.length > 0 && (
        <section className="adjy-container adjy-section border-t border-border/60">
          <SectionHeading
            eyebrow="Öne çıkanlar"
            title="Çok sevilen ürünler"
            action={{ label: "Hepsini gör", href: "/products" }}
          />
          <div className="mt-8">
            <ProductRail products={featured} />
          </div>
        </section>
      )}

      <PromoBand product={promo} count={customizable.length > 0 ? customizableCount : 0} />

      {customizable.length > 0 && (
        <section className="adjy-container adjy-section">
          <SectionHeading
            eyebrow="Özel ölçüde üretim"
            title="Rafınıza, masanıza, pencerenize göre"
            action={{ label: "Hepsini gör", href: "/products?customizable=true" }}
          />
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

      <CustomerVoices sozler={sesler.sozler} ortalama={sesler.ortalama} />

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
