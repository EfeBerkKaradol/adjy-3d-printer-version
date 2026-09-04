import { prisma } from "@/lib/db";
import { Hero } from "@/components/home/Hero";
import { CategoryGrid, type HomeCategory } from "@/components/home/CategoryGrid";
import { ConfiguratorShowcase } from "@/components/home/ConfiguratorShowcase";
import { CreateSection } from "@/components/home/CreateSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Editorial } from "@/components/home/Editorial";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/ui/section-heading";
import { WebSiteJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";
import { resolvePublicImage } from "@/lib/publicAsset";

// Ana sayfa vitrini veritabanından beslenir; statik kalırsa yeni ürünler
// ancak yeni bir deploy ile görünür. 5 dakikada bir tazelenir.
export const revalidate = 300;

// ==========================================
// ANA SAYFA
// Akış: hero → kategoriler → seçili ürünler →
// parametrik konfigüratör → kendi modelini üret →
// nasıl çalışır → editoryal.
//
// Tüm veri Prisma ile doğrudan okunur. Veritabanına
// ulaşılamazsa sayfa boş bölümleri gizleyerek ayakta
// kalır; hiçbir bölüm hata fırlatıp sayfayı düşürmez.
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

/** Vitrin: önce öne çıkanlar, yetmezse en yeni ürünlerle 8'e tamamlanır */
async function getShowcaseProducts() {
  try {
    const featured = await prisma.product.findMany({
      where: { isActive: true, featured: true },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: CARD_SELECT,
    });

    let products = featured;
    if (products.length < 8) {
      const fillers = await prisma.product.findMany({
        where: {
          isActive: true,
          id: { notIn: products.map((p) => p.id) },
        },
        take: 8 - products.length,
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
        imageUrl: true,
        _count: { select: { products: true } },
      },
    });

    return categories
      .filter((c) => c._count.products > 0)
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: resolvePublicImage(c.imageUrl),
        productCount: c._count.products,
      }));
  } catch {
    return [];
  }
}

/** Konfigüratör bölümü için parametreleri olan bir ürün */
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

export default async function HomePage() {
  const [showcaseProducts, categories, configurable] = await Promise.all([
    getShowcaseProducts(),
    getCategories(),
    getConfigurableProduct(),
  ]);

  const baseUrl = getAbsoluteUrl();

  // Hero ve editoryal bölüm için görseli olan ürünleri seç
  const withImage = showcaseProducts.filter((p) => p.thumbnailUrl);
  const heroProduct = withImage[0] ?? showcaseProducts[0] ?? null;
  const editorialProduct = withImage[1] ?? withImage[0] ?? null;

  return (
    <>
      <WebSiteJsonLd
        name="ADJY — Parametrik 3D Baskı Ürünleri"
        url={baseUrl}
        description="Hazır 3D baskı ürünlerini satın al, ölçülerini parametrik olarak değiştir ya da kendi modelini yükleyip ürettir."
      />

      <Hero product={heroProduct} />

      {/* 02 — Kategoriler */}
      {categories.length > 0 && (
        <section className="adjy-container adjy-section" aria-label="Kategoriler">
          <SectionHeading
            eyebrow="Koleksiyonlar"
            title="Kategoriye göre keşfet"
            action={{ label: "Tüm koleksiyonlar", href: "/collections" }}
            className="mb-10 md:mb-14"
          />
          <div id="kategoriler">
            <CategoryGrid categories={categories} />
          </div>
        </section>
      )}

      {/* 03 — Seçili ürünler */}
      {showcaseProducts.length > 0 && (
        <section
          className="adjy-container adjy-section pt-0 md:pt-0"
          aria-label="Seçili ürünler"
        >
          <SectionHeading
            eyebrow="Mağaza"
            title="Seçili ürünler"
            description="ADJY tarafından tasarlanır, yapılandırılır ve üretilir."
            action={{ label: "Tüm ürünler", href: "/products" }}
            className="mb-10 md:mb-14"
          />
          <div id="secili-urunler">
            <ProductGrid products={showcaseProducts} />
          </div>
        </section>
      )}

      {/* 04 — Parametrik konfigüratör */}
      {configurable && (
        <section
          className="border-y border-border bg-surface"
          aria-label="Parametrik konfigüratör"
        >
          <div className="adjy-container adjy-section">
            <SectionHeading
              eyebrow="Özelleştir"
              title="Tek tasarım. Senin ölçülerin."
              description="Seçili ürünleri yaşadığın alana göre ayarla; ölçüyü sen belirle, üretimi biz yapalım."
              className="mb-12 md:mb-16"
            />
            <div id="konfiguratör">
              <ConfiguratorShowcase product={configurable} />
            </div>
          </div>
        </section>
      )}

      {/* 05 — Kendi modelini üret */}
      <CreateSection />

      {/* 06 — Nasıl çalışır */}
      <section className="adjy-container adjy-section" aria-label="ADJY nasıl çalışır">
        <SectionHeading
          eyebrow="Süreç"
          title="ADJY nasıl çalışır"
          className="mb-10 md:mb-14"
        />
        <div id="nasil-calisir">
          <HowItWorks />
        </div>
      </section>

      {/* 07 — Editoryal */}
      <Editorial
        image={
          editorialProduct?.thumbnailUrl
            ? { url: editorialProduct.thumbnailUrl, alt: editorialProduct.name }
            : null
        }
      />
    </>
  );
}
