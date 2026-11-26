import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { PrinterIntro } from "@/components/home/printer/PrinterIntro";
import { HAND_DRAWN, PRINTABLES, type PrintItem } from "@/components/home/printer/catalog";
import { kindForCategory } from "@/components/home/printer/sprites";
import { formatTRY } from "@/lib/slicer";
import { CustomerVoices, type Soz } from "@/components/home/CustomerVoices";
import { TrustRow } from "@/components/home/TrustRow";
import { CategoryGrid, type HomeCategory } from "@/components/home/CategoryGrid";
import { loadCategoryTree } from "@/lib/categoryTree";
import { CreateSection } from "@/components/home/CreateSection";
import { ProductRail, type RailProduct } from "@/components/product/ProductRail";
import { SectionHeading } from "@/components/ui/section-heading";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";
import { secondImageOf } from "@/lib/gallery";
import { collectionFilter } from "@/lib/categoryTree";
import { YILBASI, yilbasiAktif } from "@/lib/yilbasi";
import { YilbasiVitrini } from "@/components/yilbasi/YilbasiVitrini";
import { ONE_CIKANLAR, TASARIM_ARACLARI, aracBul } from "@/lib/tasarim/catalog";
import { TasarimAracKartlari } from "@/components/tasarim/TasarimAracKartlari";

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
//   Sizi ayıran ne?    → kendin tasarla: adını yazdığın, rengini ve
//                        ölçüsünü kurduğun ürünler. Bizi mağazadan
//                        ayıran şey bu olduğu için en üstte durur.
//   Nelerin var?       → kategoriler (kataloğun genişliği)
//   En iyileri?        → öne çıkanlar
//   Yeni ne var?       → yeni gelenler
//   Alanlar ne dedi?   → müşteri yorumları
//   Size niye güveneyim? → güven şeridi
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
  gallery: true,
  createdAt: true,
  category: { select: { name: true } },
  _count: { select: { parameters: true } },
} as const;

/**
 * Ana sayfadaki Kendin Tasarla vitrini: öne çıkan ürünlerin ilk altısı
 * (catalog.ts, ONE_CIKANLAR), ilki büyük kart. Katalogdan okunur,
 * veritabanı gerekmez.
 */
const TASARIM_VITRINI = ONE_CIKANLAR.slice(0, 6);

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
    gallery: unknown;
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
    hoverImageUrl: secondImageOf(p.thumbnailUrl, p.gallery),
    category: p.category,
    isNew: markNew && p.createdAt.getTime() > cutoff,
    isCustomizable: p.slug.startsWith("tasarla-"),
  };
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
        category: { select: { slug: true, name: true, parent: { select: { slug: true } } } },
      },
    });
    if (rows.length > 0) {
      return rows.map((r) => {
        const elle = HAND_DRAWN[r.slug];
        // Elle çizilen altı ürün birebir o ürün: adı ve fiyatı yazılır.
        // Diğerlerinin çizimi kategorisinden türetildiği için ürün adı
        // çizimle uyuşmayabiliyordu; altına kategorisi yazılır ve
        // bağlantı kategoriye gider.
        if (elle) {
          return {
            key: elle,
            name: r.name,
            href: `/products/${r.slug}`,
            price: formatTRY(Number(r.basePrice)),
          };
        }
        return {
          key: `${kindForCategory([r.category.slug, r.category.parent?.slug])}:${r.slug}`,
          name: r.category.name,
          href: `/products?category=${r.category.slug}`,
          price: null,
        };
      });
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
      take: 4,
      select: RAIL_SELECT,
    });
    return rows.map((p) => toRailProduct(p, true, compareAt.get(p.id) ?? null));
  } catch {
    return [];
  }
}

async function getNewArrivals(compareAt: Map<string, number>): Promise<RailProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: RAIL_SELECT,
    });
    return rows.map((p) => toRailProduct(p, true, compareAt.get(p.id) ?? null));
  } catch {
    return [];
  }
}

/** Yılbaşı döneminde: koleksiyonun ürünleri (dönem dışında boş) */
async function getYilbasiRail(compareAt: Map<string, number>): Promise<RailProduct[]> {
  if (!yilbasiAktif()) return [];
  try {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        thumbnailUrl: { not: null },
        tags: collectionFilter(YILBASI.koleksiyon),
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: RAIL_SELECT,
    });
    return rows.map((p) => toRailProduct(p, false, compareAt.get(p.id) ?? null));
  } catch {
    return [];
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
  const [categories, featured, newArrivals, sesler, printables, yilbasi] =
    await Promise.all([
      getCategories(),
      getFeaturedRail(compareAt),
      getNewArrivals(compareAt),
      getCustomerVoices(),
      getPrintables(),
      getYilbasiRail(compareAt),
    ]);
  const tasarimVitrini = TASARIM_VITRINI.map((id) => aracBul(id)).filter((a) => a !== null);

  return (
    <>
      <OrganizationJsonLd url={getAbsoluteUrl()} />
      <WebSiteJsonLd
        name="ADJY"
        url={getAbsoluteUrl()}
        description="Siparişe özel üretilen vazo, saksı, aydınlatma, düzenleyici ve kişiye özel hediyeler. Ölçüsünü, rengini ve yazısını siz seçersiniz; Beşiktaş'taki atölyemizde 3D baskı, seramik ve alçı ile üretiriz."
      />

      <PrinterIntro items={printables} />

      {yilbasi.length > 0 && <YilbasiVitrini urunler={yilbasi} />}

      {tasarimVitrini.length > 0 && (
        // id: karşılamadaki "Kaydır" bağlantısı buraya iner
        <section id="vitrin" className="adjy-container adjy-section scroll-mt-24">
          <SectionHeading
            eyebrow="Kendin Tasarla"
            title="Sesinizden, fotoğrafınızdan, adınızdan bir ürün."
            action={{ label: `${TASARIM_ARACLARI.length} ürünün hepsi`, href: "/tasarla" }}
          />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Bu ürünlerin hazır bir hâli yok. Ses kaydınızı yükleyin, fotoğrafınızı
            seçin ya da adınızı yazın; model ekranda anında değişir, fiyatı da
            onunla birlikte. Kurduğunuz hâliyle, çok renkli basıp kargolarız.
          </p>
          <div className="mt-8">
            <TasarimAracKartlari
              araclar={tasarimVitrini}
              vitrin={TASARIM_VITRINI[0]}
              oncelikli={2}
              baslikEtiketi="h3"
            />
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="adjy-container adjy-section border-t-2 border-dashed border-foreground/25">
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


      {featured.length > 0 && (
        <section className="adjy-container adjy-section border-t-2 border-dashed border-foreground/25">
          <SectionHeading eyebrow="Öne çıkanlar" title="Çok sevilen ürünler" />
          <div className="mt-8">
            <ProductRail products={featured} moreHref="/products" />
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="adjy-container adjy-section border-t-2 border-dashed border-foreground/25">
          <SectionHeading eyebrow="Yeni gelenler" title="Atölyeden yeni çıkanlar" />
          <div className="mt-8">
            <ProductRail products={newArrivals} moreHref="/products?sort=newest" />
          </div>
        </section>
      )}

      <CustomerVoices sozler={sesler.sozler} ortalama={sesler.ortalama} />

      <TrustRow />
      <CreateSection />

      <section className="border-t-2 border-dashed border-foreground/25">
        <div className="adjy-container flex flex-col gap-5 py-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="adjy-display text-[clamp(1.4rem,2.6vw,2rem)]">
              ADJY nasıl çalışır?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Siparişiniz atölyeye düştüğü andan kargoya verildiği güne kadar ne
              olduğunu, hangi malzemeyle ürettiğimizi ve neleri yapamadığımızı
              anlattık.
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
