import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { ProductGrid } from "@/components/product/ProductGrid";
import { secondImageOf } from "@/lib/gallery";
import { FilterDropdown } from "@/components/product/FilterDropdown";
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
import { TASARIM_KATEGORISI } from "@/lib/tasarim/catalog";
import { satirGosterimi } from "@/lib/tasarim/pricing";
import { MAGAZA_LISTELERI_ETIKETI, MAGAZA_LISTELERI_SURESI } from "./onbellek";
import { YILBASI, yilbasiAktif } from "@/lib/yilbasi";
import { YilbasiBandi } from "@/components/yilbasi/YilbasiBandi";

/**
 * Ayarlanabilir ürün: yalnızca tasarım aracıyla kurulan "Kendin
 * Üret" ürünleri (slug: tasarla-…). Hazır ürünlerin ölçüsü seçilmez.
 */
const PARAMETRIK = { slug: { startsWith: "tasarla-" } };

// ==========================================
// MAĞAZA (Server Component)
// Üstte açılır buzlu filtre menüsü, altında tam genişlik
// ürün ızgarası (masaüstünde satırda 5 ürün).
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

// 5 sütunlu ızgarada tam satırlar: 20 ürün = masaüstünde 4 satır
// (4, 2 sütunda da tam satır)
const PAGE_SIZE = 20;

// Filtre çubuğunun listeleri (kategori ağacı, koleksiyonlar,
// malzemeler) seçilen filtreden bağımsız ve seyrek değişiyor;
// yine de her sayfa açılışında, her filtre tıklamasında yeniden
// soruluyorlardı. Beş dakikalığına saklanırlar; yönetim panelinde
// ürün ya da kategori değişince etiketle hemen düşürülürler
// (bkz. ./onbellek.ts). Veritabanı hatası saklanmaz.
const LISTE_ONBELLEGI = {
  revalidate: MAGAZA_LISTELERI_SURESI,
  tags: [MAGAZA_LISTELERI_ETIKETI],
};

const kategoriAgaci = unstable_cache(
  () => loadCategoryTree(prisma),
  ["magaza-kategori-agaci"],
  LISTE_ONBELLEGI
);

const koleksiyonEtiketleri = unstable_cache(
  () => loadCollectionTags(prisma),
  ["magaza-koleksiyon-etiketleri"],
  LISTE_ONBELLEGI
);

const malzemeTurleri = unstable_cache(
  async () => {
    const rows = await prisma.product.findMany({
      where: { isActive: true, materialType: { not: null } },
      select: { materialType: true },
      distinct: ["materialType"],
    });
    return rows
      .map((m) => m.materialType)
      .filter((m): m is string => Boolean(m))
      .sort();
  },
  ["magaza-malzeme-turleri"],
  LISTE_ONBELLEGI
);

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
  // "Kendin Tasarla" kategorisi bütün özelleştirilebilir ürünleri
  // listeler: kategoride yalnız eşleşen mağaza kategorisi olmayan
  // araçlar duruyor (saksı "Saksılar"da, avize "Aydınlatma"da).
  if (params.category === TASARIM_KATEGORISI.slug) where.AND = [PARAMETRIK];
  else if (params.category) where.category = categoryFilter(params.category);
  if (params.koleksiyon) where.tags = collectionFilter(params.koleksiyon);
  if (params.featured === "true") where.featured = true;
  if (params.inStock === "true") where.stockQty = { gt: 0 };
  // Ayarlanabilir ürün = Kendin Üret ürünü (bkz. PARAMETRIK)
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

    // Filtreden bağımsız listeler ve sayım, ürün sorgularını
    // beklemeden hemen başlar. Önceden dört tur art arda gidiliyordu:
    // malzemeler → sıra → sayfa → sayım ve listeler.
    const malzemeler = malzemeTurleri();

    const urunSecimi = {
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
    } as const;

    // Bu sayfanın ürünleri ve toplam sayı
    async function sayfayiOku() {
      // Aile filtresi için önce hangi malzemeler var, onu bilmek
      // gerekiyor: "seramik" seçimi, o aileye giren bütün malzeme
      // adlarına çevrilerek sorguya giriyor.
      if (selectedMaterial) {
        const values = materialFilterValues(selectedMaterial, await malzemeler);
        where.materialType = values.length === 1 ? { equals: values[0], mode: "insensitive" } : { in: values };
      }

      // Varsayılan sıralama: önce bütün listenin sırası (yalnız kimlik
      // ve slug) kurulur, tasarım ürünleri araya dağıtılır, sonra bu
      // sayfanın ürünleri okunur. Diğer sıralamalarda doğrudan sayfa.
      const varsayilanSira = !params.sort || params.sort === "popular";
      if (!varsayilanSira) {
        const [rows, count] = await Promise.all([
          prisma.product.findMany({
            where,
            orderBy: buildOrderBy(params.sort),
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            select: urunSecimi,
          }),
          prisma.product.count({ where }),
        ]);
        return { rows, count };
      }

      const sira = await prisma.product.findMany({
        where,
        orderBy: buildOrderBy(params.sort),
        select: { id: true, slug: true },
      });
      const sayfaKimlikleri = aralaraDagit(sira)
        .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        .map((p) => p.id);
      const rows = await prisma.product.findMany({
        where: { id: { in: sayfaKimlikleri } },
        select: urunSecimi,
      });
      // Kimlik listesiyle okunan sayfa, dağıtılmış sıraya geri dizilir
      const yer = new Map(sayfaKimlikleri.map((id, i) => [id, i]));
      rows.sort((a, b) => (yer.get(a.id) ?? 0) - (yer.get(b.id) ?? 0));
      // Sıra listesi aynı filtreyle okundu: uzunluğu toplam sayıdır,
      // ayrıca saydırmaya gerek yok.
      return { rows, count: sira.length };
    }

    const [{ rows, count }, materialTypes, configurableCount, tree, collectionTags] =
      await Promise.all([
        sayfayiOku(),
        malzemeler,
        prisma.product.count({
          where: { isActive: true, ...PARAMETRIK },
        }),
        kategoriAgaci(),
        koleksiyonEtiketleri(),
      ]);

    return {
      products: rows.map(({ gallery, tags, ...p }) => ({
        ...p,
        isYilbasi: yilbasi && tags.length > 0,
        // Kendin Tasarla ürününde ad ve fiyat katalogdan
        ...satirGosterimi(p),
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
          productCount: c.slug === TASARIM_KATEGORISI.slug ? configurableCount : c.productCount,
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

      <div className="mt-10">
        <div>
          {/* Filtreler: düğmeye basınca yukarıdan açılan buzlu panel */}
          <Suspense fallback={<div className="h-[54px] border-b-2 border-dashed border-foreground/25" />}>
            <FilterDropdown
              categories={categories}
              collections={collections}
              materials={materialChoices}
              resultCount={totalCount}
            />
          </Suspense>

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
              <ProductGrid products={products} columns={5} />
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
