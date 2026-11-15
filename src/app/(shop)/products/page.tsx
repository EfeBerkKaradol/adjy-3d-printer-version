import type { Metadata } from "next";
import { Suspense } from "react";
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
import { ItemListJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";
import {
  categoryFilter,
  collectionFilter,
  loadCategoryTree,
  loadCollectionTags,
  type CollectionTag,
} from "@/lib/categoryTree";
import type { FilterCategory } from "@/components/product/ProductFilters";
import { tasarimUrunleriniHazirla } from "@/lib/tasarim/ensure";
import { YILBASI, yilbasiAktif } from "@/lib/yilbasi";
import { YilbasiBandi } from "@/components/yilbasi/YilbasiBandi";

/**
 * Parametrik ürün: ölçü parametresi olan ürün ya da bir tasarım
 * aracıyla kurulan "Kendin Tasarla" ürünü (slug: tasarla-…).
 */
const PARAMETRIK = {
  OR: [{ parameters: { some: {} } }, { slug: { startsWith: "tasarla-" } }],
};

// ==========================================
// MAĞAZA (Server Component)
// Solda filtre kenar çubuğu, sağda ürün listesi.
// Veri doğrudan Prisma ile okunur — Vercel'de
// self-fetch sorunu yaşanmaz.
// ==========================================

export const metadata: Metadata = {
  title: "Mağaza",
  description:
    "ADJY ürünlerini keşfedin. Parametrik ürünlerin ölçülerini kendi alanınıza göre değiştirin, AR ile önizleyin ve satın alın.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Mağaza | ADJY",
    description: "ADJY ürünlerini keşfedin — çoğu ölçüsü değiştirilebilir parametrik ürün.",
  },
};

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

/**
 * Varsayılan sıralamada "Kendin Tasarla" ürünleri (slug: tasarla-…)
 * listenin başına yığılmasın: hepsi aynı gün eklendiği için en yeni
 * sıralamada ilk sayfayı kaplıyorlardı. Diğer ürünlerin sırası
 * korunur, tasarım ürünleri liste boyunca eşit aralıklarla araya
 * yerleşir (ör. 32 + 10 üründe yaklaşık her dördüncü kart).
 */
function aralaraDagit<T extends { slug: string }>(sirali: T[]): T[] {
  const tasarim = sirali.filter((p) => p.slug.startsWith("tasarla-"));
  if (tasarim.length === 0 || tasarim.length === sirali.length) return sirali;
  const diger = sirali.filter((p) => !p.slug.startsWith("tasarla-"));
  const toplam = sirali.length;
  const yerler = new Set(
    tasarim.map((_, i) => Math.min(toplam - 1, Math.round(((i + 0.5) * toplam) / tasarim.length)))
  );
  const sonuc: T[] = [];
  let t = 0;
  let d = 0;
  for (let i = 0; i < toplam; i++) {
    if ((yerler.has(i) && t < tasarim.length) || d >= diger.length) sonuc.push(tasarim[t++]);
    else sonuc.push(diger[d++]);
  }
  return sonuc;
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
  // ya da tasarım aracıyla kurulan ürün (bkz. PARAMETRIK)
  if (params.customizable === "true") where.AND = [PARAMETRIK];
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

  const yilbasi = yilbasiAktif();

  async function loadProducts() {
    // Kendin Tasarla ürünlerinin satırları yoksa açılır ki mağazada
    // her zaman görünsünler (sunucu başına bir kez çalışır).
    await tasarimUrunleriniHazirla();

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

    // Varsayılan sıralama: önce bütün listenin sırası (yalnız kimlik
    // ve slug) kurulur, tasarım ürünleri araya dağıtılır, sonra bu
    // sayfanın ürünleri okunur. Diğer sıralamalarda doğrudan sayfa.
    const varsayilanSira = !params.sort || params.sort === "popular";
    let sayfaKimlikleri: string[] | null = null;
    if (varsayilanSira) {
      const sira = await prisma.product.findMany({
        where,
        orderBy: buildOrderBy(params.sort),
        select: { id: true, slug: true },
      });
      sayfaKimlikleri = aralaraDagit(sira)
        .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        .map((p) => p.id);
    }

    const [rows, count, configurableCount, tree, collectionTags] = await Promise.all([
      prisma.product.findMany({
        where: sayfaKimlikleri ? { id: { in: sayfaKimlikleri } } : where,
        orderBy: buildOrderBy(params.sort),
        ...(sayfaKimlikleri ? {} : { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
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
          // Yılbaşı etiketi için yalnızca koleksiyon etiketine bakılır
          tags: {
            where: { tag: { slug: YILBASI.koleksiyon } },
            select: { tagId: true },
          },
        },
      }),
      prisma.product.count({ where }),
      prisma.product.count({
        where: { isActive: true, ...PARAMETRIK },
      }),
      loadCategoryTree(prisma),
      loadCollectionTags(prisma),
    ]);

    // Kimlik listesiyle okunan sayfa, dağıtılmış sıraya geri dizilir
    if (sayfaKimlikleri) {
      const sira = new Map(sayfaKimlikleri.map((id, i) => [id, i]));
      rows.sort((a, b) => (sira.get(a.id) ?? 0) - (sira.get(b.id) ?? 0));
    }

    return {
      products: rows.map(({ gallery, tags, ...p }) => ({
        ...p,
        isYilbasi: yilbasi && tags.length > 0,
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

      {/* Yılbaşı döneminde sayfanın başında sezon bandı */}
      {yilbasi && params.koleksiyon !== YILBASI.koleksiyon && <YilbasiBandi className="mb-10" />}

      {/* Başlık */}
      <header className="max-w-2xl">
        <p className="adjy-eyebrow mb-4">Mağaza</p>
        <h1 className="adjy-display text-[clamp(2rem,4vw,3rem)]">
          Ürünler
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Kendi atölyemizde üretilen ADJY ürünleri. Çoğunun ölçüsünü kartın
          altındaki kaydırıcıdan kendinize göre ayarlayabilirsiniz.
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
