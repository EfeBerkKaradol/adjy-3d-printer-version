import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { prisma } from "@/lib/db";
import { ProductGrid } from "@/components/product/ProductGrid";
import { secondImageOf } from "@/lib/gallery";
import { ProductFilters } from "@/components/product/ProductFilters";
import { FilterDrawer } from "@/components/product/FilterDrawer";
import { SortDropdown } from "@/components/product/SortDropdown";
import { ActiveFilterChips } from "@/components/product/ActiveFilterChips";
import { CategoryChips } from "@/components/product/CategoryChips";
import { Pagination } from "@/components/ui/pagination";
import { materialFilterValues, materialOptions, type MaterialOption } from "@/lib/materialFamily";
import { ItemListJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";
import {
  categoryFilter,
  collectionFilter,
  loadCategoryTree,
  loadCollectionTags,
  type CollectionTag,
} from "@/lib/categoryTree";
import type { FilterCategory } from "@/components/product/ProductFilters";

// ==========================================
// MAĞAZA (Server Component)
// Solda filtre kenar çubuğu, sağda ürün listesi.
// Veri doğrudan Prisma ile okunur — Vercel'de
// self-fetch sorunu yaşanmaz.
// ==========================================

const STORE_TITLE = "Mağaza";
const STORE_DESCRIPTION =
  "ADJY ürünlerini keşfedin. Parametrik ürünlerin ölçülerini kendi alanınıza göre değiştirin, AR ile önizleyin ve satın alın.";

type StoreParams = Awaited<ProductsPageProps["searchParams"]>;

// Sayfanın "açılış sayfası" sayılan biçimleri: düz mağaza,
// tek bir kategori ya da tek bir koleksiyon (sayfa numarası
// olabilir). Arama, sıralama, fiyat/malzeme filtreleri ise
// sonsuz sayıda kopya adres üretir; onlar dizine alınmaz.
const LANDING_KEYS = new Set(["category", "koleksiyon", "page"]);

interface StoreLanding {
  kind: "store" | "category" | "collection";
  name: string;
  description: string;
  /** Sayfa numarasız kanonik adres */
  path: string;
  /** Kategori ise ana kategorisi (kırıntı yolu için) */
  parent?: { name: string; slug: string } | null;
}

function isLandingView(params: StoreParams): boolean {
  const keys = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k]) => k);
  if (keys.some((k) => !LANDING_KEYS.has(k))) return false;
  // Kategori ve koleksiyon birlikte seçilmişse kesişimdir
  return !(params.category && params.koleksiyon);
}

/**
 * Kategori/koleksiyon adı ve açıklaması.
 *
 * Eskiden bütün kategori görünümleri /products'a kanonik
 * gösteriyordu: "Vazolar", "Saksılar", "Aydınlatma" gibi en
 * çok aranan sayfalar Google'a ayrı sayfa olarak hiç
 * bildirilmiyordu (site haritasında olsalar bile). Artık her
 * kategori kendi başlığı, açıklaması ve kanonik adresiyle
 * dizine giriyor.
 */
// Metadata ve sayfa aynı isteği iki kez yapmasın
const resolveLanding = cache(
  (category?: string, koleksiyon?: string) => loadLanding(category, koleksiyon)
);

async function loadLanding(category?: string, koleksiyon?: string): Promise<StoreLanding | null> {
  const params = { category, koleksiyon };
  if (params.category) {
    const c = await prisma.category.findFirst({
      where: { slug: params.category, isActive: true },
      select: {
        name: true,
        slug: true,
        description: true,
        parent: { select: { name: true, slug: true } },
      },
    });
    if (!c) return null;
    return {
      kind: "category",
      name: c.name,
      description:
        c.description?.trim() ||
        `${c.name}: ADJY atölyesinde 3D baskı, seramik ve alçı ile üretilen, çoğunun ölçüsünü kendinize göre ayarlayabildiğiniz tasarım ürünleri.`,
      path: `/products?category=${encodeURIComponent(c.slug)}`,
      parent: c.parent,
    };
  }
  if (params.koleksiyon) {
    const t = await prisma.tag.findFirst({
      where: { slug: params.koleksiyon },
      select: { name: true, slug: true },
    });
    if (!t) return null;
    return {
      kind: "collection",
      name: t.name,
      description: `ADJY ${t.name} koleksiyonu: kendi atölyemizde üretilen, ölçüsünü kendinize göre ayarlayabildiğiniz tasarım ürünleri.`,
      path: `/products?koleksiyon=${encodeURIComponent(t.slug)}`,
    };
  }
  return { kind: "store", name: STORE_TITLE, description: STORE_DESCRIPTION, path: "/products" };
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const pageNo = Math.max(1, Number(params.page) || 1);

  // Arama/filtre/sıralama: sayfa çalışır ama dizine girmez,
  // bağlantıları izlenir; kanonik sade mağaza.
  if (!isLandingView(params)) {
    return {
      title: params.search ? `"${params.search.slice(0, 40)}" araması` : STORE_TITLE,
      description: STORE_DESCRIPTION,
      alternates: { canonical: "/products" },
      robots: { index: false, follow: true },
    };
  }

  let landing: StoreLanding | null = null;
  try {
    landing = await resolveLanding(params.category, params.koleksiyon);
  } catch {
    // Veritabanı anlık yanıt vermezse sayfayı dizinden
    // düşürmeyelim: genel başlıkla, noindex olmadan dön.
    return { title: STORE_TITLE, description: STORE_DESCRIPTION };
  }
  if (!landing) {
    // Böyle bir kategori/koleksiyon yok
    return {
      title: STORE_TITLE,
      description: STORE_DESCRIPTION,
      alternates: { canonical: "/products" },
      robots: { index: false, follow: true },
    };
  }

  const sep = landing.path.includes("?") ? "&" : "?";
  const canonical = pageNo > 1 ? `${landing.path}${sep}page=${pageNo}` : landing.path;
  const baseTitle = landing.kind === "store" ? STORE_TITLE : landing.name;
  const title = pageNo > 1 ? `${baseTitle} — Sayfa ${pageNo}` : baseTitle;

  return {
    title,
    description: landing.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: "ADJY",
      url: canonical,
      title: `${title} | ADJY`,
      description: landing.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ADJY`,
      description: landing.description,
    },
  };
}


const PAGE_SIZE = 12;

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    koleksiyon?: string;
    featured?: string;
    customizable?: string;
    inStock?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

function buildOrderBy(sort?: string) {
  switch (sort) {
    case "price_asc":
      return { basePrice: "asc" as const };
    case "price_desc":
      return { basePrice: "desc" as const };
    case "newest":
      return { createdAt: "desc" as const };
    case "rating":
      return { reviews: { _count: "desc" as const } };
    case "popular":
    default:
      return [{ featured: "desc" as const }, { createdAt: "desc" as const }];
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true };

  // Ana kategori seçilince alt kategorilerindeki ürünler de gelir
  if (params.category) where.category = categoryFilter(params.category);
  if (params.koleksiyon) where.tags = collectionFilter(params.koleksiyon);
  if (params.featured === "true") where.featured = true;
  if (params.inStock === "true") where.stockQty = { gt: 0 };
  // Parametrik ürün = en az bir Parameter kaydı olan ürün
  if (params.customizable === "true") where.parameters = { some: {} };
  // Malzeme filtresi aile bazlı çalışır: "seramik" seçildiğinde
  // o aileye giren bütün malzeme adları eşleşir. Tekil bir
  // malzeme adı verilirse (eski bağlantılar) o da çalışır.
  const selectedMaterial = params.material ?? null;
  if (params.minPrice || params.maxPrice) {
    where.basePrice = {};
    const min = Number(params.minPrice);
    const max = Number(params.maxPrice);
    if (Number.isFinite(min) && params.minPrice) where.basePrice.gte = min;
    if (Number.isFinite(max) && params.maxPrice) where.basePrice.lte = max;
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }

  let products: Awaited<ReturnType<typeof loadProducts>>["products"] = [];
  let totalCount = 0;
  let categories: FilterCategory[] = [];
  let collections: CollectionTag[] = [];
  let materialChoices: MaterialOption[] = [];
  let configurableCount = 0;
  let failed = false;

  async function loadProducts() {
    // Aile filtresi için önce hangi malzemeler var, onu bilmek
    // gerekiyor: "seramik" seçimi, o aileye giren bütün malzeme
    // adlarına çevrilerek sorguya giriyor.
    const materialRows = await prisma.product.findMany({
      where: { isActive: true, materialType: { not: null } },
      select: { materialType: true },
      distinct: ["materialType"],
    });
    const materialTypes = materialRows
      .map((m) => m.materialType)
      .filter((m): m is string => Boolean(m))
      .sort();

    if (selectedMaterial) {
      const values = materialFilterValues(selectedMaterial, materialTypes);
      where.materialType = values.length === 1 ? { equals: values[0], mode: "insensitive" } : { in: values };
    }

    const [rows, count, configurableCount, tree, collectionTags] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: buildOrderBy(params.sort),
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          basePrice: true,
          thumbnailUrl: true,
          gallery: true,
          featured: true,
          widthMm: true,
          depthMm: true,
          heightMm: true,
          // Ölçü kaydırıcıları kartın altında çalışıyor
          parameters: {
            orderBy: { sortOrder: "asc" },
            select: {
              name: true,
              displayName: true,
              minValue: true,
              maxValue: true,
              defaultValue: true,
              step: true,
              unit: true,
              affectsPrice: true,
              priceFormula: true,
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { reviews: true, parameters: true } },
        },
      }),
      prisma.product.count({ where }),
      prisma.product.count({
        where: { isActive: true, parameters: { some: {} } },
      }),
      loadCategoryTree(prisma),
      loadCollectionTags(prisma),
    ]);

    return {
      products: rows.map(({ gallery, ...p }) => ({
        ...p,
        basePrice: Number(p.basePrice),
        hoverImageUrl: secondImageOf(p.thumbnailUrl, gallery),
      })),
      count,
      configurableCount,
      materialTypes,
      collections: collectionTags,
      categories: tree
        .filter((c) => c.productCount > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          productCount: c.productCount,
          children: c.children.filter((k) => k.productCount > 0),
        })),
    };
  }

  try {
    const data = await loadProducts();
    products = data.products;
    totalCount = data.count;
    materialChoices = materialOptions(data.materialTypes);
    categories = data.categories;
    collections = data.collections;
    configurableCount = data.configurableCount;
  } catch (error) {
    console.error("Ürünler yüklenirken hata:", error);
    failed = true;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Başlıkta kategori/koleksiyon adı ve açıklaması
  let landing: StoreLanding | null = null;
  if (!failed && isLandingView(params)) {
    try {
      landing = await resolveLanding(params.category, params.koleksiyon);
    } catch {
      landing = null;
    }
  }

  return (
    <div className="adjy-container py-10 md:py-14">
      {/* Listedeki sıranın arama motorunca liste olarak
          anlaşılması için — çıplak bağlantı yığını değil. */}
      {products.length > 0 && (
        <ItemListJsonLd
          items={products.map((p) => ({
            name: p.name,
            url: `${getAbsoluteUrl()}/products/${p.slug}`,
          }))}
        />
      )}

      {landing && landing.kind !== "store" && (
        <BreadcrumbJsonLd
          items={[
            { name: "Ana sayfa", url: getAbsoluteUrl() },
            { name: "Mağaza", url: `${getAbsoluteUrl()}/products` },
            ...(landing.parent
              ? [
                  {
                    name: landing.parent.name,
                    url: `${getAbsoluteUrl()}/products?category=${encodeURIComponent(landing.parent.slug)}`,
                  },
                ]
              : []),
            { name: landing.name, url: `${getAbsoluteUrl()}${landing.path}` },
          ]}
        />
      )}

      {/* Başlık — kategori/koleksiyon seçiliyse onun adı:
          sayfanın tek h1'i aranan ifadeyi taşısın */}
      <header className="max-w-2xl">
        <p className="adjy-eyebrow mb-4">
          {landing && landing.kind !== "store" ? (landing.parent?.name ?? "Mağaza") : "Mağaza"}
        </p>
        <h1 className="adjy-display text-[clamp(2rem,4vw,3rem)]">
          {landing && landing.kind !== "store" ? landing.name : "Ürünler"}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          {landing && landing.kind !== "store"
            ? landing.description
            : "Kendi atölyemizde üretilen ADJY ürünleri. Çoğunun ölçüsünü kartın altındaki kaydırıcıdan kendinize göre ayarlayabilirsiniz."}
        </p>
      </header>

      <div className="mt-10 md:mt-12">
        <Suspense fallback={<div className="h-12" />}>
          <CategoryChips
            categories={categories}
            collections={collections}
            configurableCount={configurableCount}
          />
        </Suspense>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-14">
        {/* Kenar çubuğu — masaüstü */}
        <aside className="hidden lg:block" aria-label="Ürün filtreleri">
          <div className="sticky top-24">
            <Suspense fallback={<div className="h-96" />}>
              <ProductFilters categories={categories} collections={collections} materials={materialChoices} />
            </Suspense>
          </div>
        </aside>

        {/* Liste */}
        <div>
          <div className="flex items-center justify-between gap-4 border-b-2 border-dashed border-foreground/25 pb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">
                {totalCount}
              </span>{" "}
              ürün
            </p>
            <div className="hidden lg:block">
              <Suspense fallback={null}>
                <SortDropdown />
              </Suspense>
            </div>
            {/* Mobil/tablet: filtre ve sıralama çekmeceleri */}
            <Suspense fallback={null}>
              <FilterDrawer
                categories={categories}
                collections={collections}
                materials={materialChoices}
                resultCount={totalCount}
              />
            </Suspense>
          </div>

          <Suspense fallback={null}>
            <ActiveFilterChips categories={categories} collections={collections} />
          </Suspense>

          <div className="mt-8">
            {failed ? (
              <div className="border-2 border-dashed border-foreground/30 px-6 py-20 text-center">
                <p className="text-base font-medium">Ürünler yüklenemedi</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Bağlantı sorunu olabilir. Lütfen sayfayı yenileyin.
                </p>
              </div>
            ) : (
              <ProductGrid products={products} />
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-14">
              <Suspense>
                <Pagination currentPage={page} totalPages={totalPages} />
              </Suspense>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
