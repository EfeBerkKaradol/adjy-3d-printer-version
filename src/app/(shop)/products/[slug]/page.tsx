import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { aracAdresi, slugdanAracId } from "@/lib/tasarim/catalog";
import { prisma } from "@/lib/db";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductExperience } from "@/components/product/ProductExperience";
import { ProductGrid } from "@/components/product/ProductGrid";
import { readGallery, secondImageOf } from "@/lib/gallery";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { productDescription, productKeywords, productTitle } from "@/lib/seo";
import { getAbsoluteUrl } from "@/lib/url";
import { getProductType } from "@/lib/productType";
import { formatCmValue } from "@/lib/units";
import { ArrowRight } from "lucide-react";

// ==========================================
// ÜRÜN DETAY SAYFASI
// Solda galeri (yapışkan), sağda satın alma alanı.
// Satın alma alanının altındaki bilgiler açılır
// başlıklarda toplanır — sayfa açılışında yalnızca
// karar için gereken bilgi görünür.
//
// Varyant (renk/beden) seçici bilinçli olarak yok:
// sepet store'u varyant taşımıyor, seçim sipariş
// kaydına yansımazdı.
// ==========================================

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

// Ürün sayfası her istekte baştan çiziliyordu; içinde ziyaretçiye
// ya da isteğe özel hiçbir şey yok (sepet, favori ve yorumlar
// tarayıcıda yüklenir). Beş dakikalığına saklanır.
//
// Derleme anında hiçbir ürün üretilmez (liste boş): veritabanına
// derlemede dokunulmaz, her ürün ilk ziyaretinde çizilip saklanır.
// Yönetim panelindeki değişiklikler beş dakikayı beklemez — ilgili
// uçlar sayfayı düşürür (bkz. ../onbellek.ts).
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

// cache(): generateMetadata ile sayfa aynı ürünü ayrı ayrı
// soruyordu; aynı çizimde tek sorguya iner.
const getProduct = cache(async (slug: string) => {
  const byId = /^c[a-z0-9]{24,}$/.test(slug);
  const where = byId ? { id: slug, isActive: true } : { slug, isActive: true };

  // Puan ortalaması veritabanında hesaplanır: ortalama almak için
  // bütün yorum satırlarını çekmek gerekmiyor. Ürün sorgusuyla
  // yan yana çalışır.
  const [product, puan] = await Promise.all([
    prisma.product.findFirst({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        basePrice: true,
        thumbnailUrl: true,
        gallery: true,
        printTimeEst: true,
        materialType: true,
        materialWeight: true,
        widthMm: true,
        depthMm: true,
        heightMm: true,
        customMouldFee: true,
        stockQty: true,
        featured: true,
        category: { select: { id: true, name: true, slug: true, parentId: true } },
      },
    }),
    prisma.review.aggregate({
      where: { product: where },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  if (!product) return null;

  const avgRating = puan._avg.rating ?? 0;

  return {
    ...product,
    basePrice: Number(product.basePrice),
    materialWeight: product.materialWeight ? Number(product.materialWeight) : null,
    stockQty: product.stockQty ?? 999,
    reviews: {
      averageRating: Math.round(avgRating * 10) / 10,
      totalCount: puan._count._all,
    },
  };
});

/** gallery alanı Json — yalnızca string dizisi olduğunda kullanılır */
async function getRelated(categoryId: string, parentId: string | null, excludeId: string) {
  try {
    // Aynı ana kategorinin ailesi: kendi alt kategorisi önce, sonra kardeşleri
    const familyId = parentId ?? categoryId;
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: excludeId },
        category: { OR: [{ id: familyId }, { parentId: familyId }] },
      },
      take: 4,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        thumbnailUrl: true,
        gallery: true,
        featured: true,
        category: { select: { name: true, slug: true } },
        _count: { select: { reviews: true, parameters: true } },
      },
    });
    return rows.map(({ gallery, ...p }) => ({
      ...p,
      basePrice: Number(p.basePrice),
      hoverImageUrl: secondImageOf(p.thumbnailUrl, gallery),
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: "Ürün bulunamadı" };

  // Başlık ve açıklama ürünün kendi verisinden üretilir:
  // üretim türü ve fiyat aranan ifadelerdir. Hazır ürünün ölçüsü
  // seçilmez; "… cm arası seçilebilir" yazılmaz.
  const seoInput = {
    name: product.name,
    description: product.description,
    basePrice: product.basePrice,
    categoryName: product.category.name,
    materialType: product.materialType ?? null,
    dimensions: [],
  };

  const title = productTitle(seoInput);
  const description = productDescription(seoInput);

  return {
    title,
    description,
    keywords: productKeywords(seoInput),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${title} | ADJY`,
      description,
      url: `/products/${product.slug}`,
      ...(product.thumbnailUrl && { images: [{ url: product.thumbnailUrl }] }),
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  // Tasarım aracıyla kurulan ürünlerin bakılacak hazır bir hâli
  // yok; ürün sayfası yerine araca gidilir. Mağaza kartları zaten
  // oraya bağlanıyor — bu, dışarıdan gelen bağlantılar için.
  const tasarimAraci = slugdanAracId(slug);
  if (tasarimAraci) redirect(aracAdresi(tasarimAraci));
  const product = await getProduct(slug);

  if (!product) notFound();

  const related = await getRelated(product.category.id, product.category.parentId, product.id);
  const baseUrl = getAbsoluteUrl();

  const gallery = readGallery(product.gallery);
  // Kapak karesi galerinin de ilk öğesi olduğu için liste
  // tekilleştirilir; aynı adres iki kez gelince React aynı
  // anahtarla iki çocuk uyarısı veriyordu.
  const images = [
    ...new Set(
      [product.thumbnailUrl, ...gallery].filter(
        (src): src is string => Boolean(src)
      )
    ),
  ];

  // Bu sayfadaki ürünler hazır ürünler: ölçü ayarı ve 3B model
  // gösterilmez, yalnızca görseller ve renderlar. Ayarlanabilir
  // ürünler Kendin Üret araçlarıdır (/tasarla); onların ürün
  // satırı yukarıda araca yönlendirilir. Baskı dosyaları müşteriye
  // değil atölyeye aittir (admin sipariş ekranı).

  // Montajlı dış ölçü. Derinlik her üründe kayıtlı değil;
  // olmayan eksen yazılmaz.
  const olcuEksenleri = [product.widthMm, product.depthMm, product.heightMm].filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  const olcuMetni =
    olcuEksenleri.length >= 2
      ? `${olcuEksenleri.map((v) => formatCmValue(v)).join(" × ")} cm`
      : null;

  return (
    <div className="pb-20">
      <BreadcrumbJsonLd
        items={[
          { name: "Mağaza", url: `${baseUrl}/products` },
          {
            name: product.category.name,
            url: `${baseUrl}/products?category=${product.category.slug}`,
          },
          { name: product.name, url: `${baseUrl}/products/${product.slug}` },
        ]}
      />

      <ProductJsonLd
        name={product.name}
        description={product.description || ""}
        price={product.basePrice}
        image={product.thumbnailUrl}
        url={`${baseUrl}/products/${product.slug}`}
        sku={product.sku}
        stockQty={product.stockQty}
        category={product.category.name}
        rating={
          product.reviews.totalCount > 0
            ? {
                average: product.reviews.averageRating,
                count: product.reviews.totalCount,
              }
            : undefined
        }
      />

      <div className="adjy-container">
        {/* Breadcrumb */}
        <nav aria-label="Konum" className="py-6">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <li>
              <Link href="/products" className="transition-colors hover:text-foreground">
                Mağaza
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="transition-colors hover:text-foreground"
              >
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground">{product.name}</li>
          </ol>
        </nav>

        {/* Başlık, görsel ve seçenekler.
            Önceden galeri solda, sağda okunur bir ölçü listesi ve üç
            ayrı düğme vardı; ölçü değiştirmek başka bir sayfaya
            gidiyordu. Artık ikisi tek bileşende ve seçim burada. */}
        <header className="mb-8 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/products?category=${product.category.slug}`}
              className="adjy-eyebrow transition-colors hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </div>
          <h1 className="adjy-display mt-3 text-[clamp(1.8rem,3.6vw,2.8rem)]">
            {product.name}
          </h1>
          {product.description && (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}
        </header>

        <ProductExperience
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            basePrice: product.basePrice,
            thumbnailUrl: product.thumbnailUrl,
            images,
            modelFileUrl: null,
            productType: getProductType(product.slug),
            stockQty: product.stockQty,
            customMouldFee: product.customMouldFee ? Number(product.customMouldFee) : null,
            parameters: [],
          }}
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div />
          <div className="max-w-lg">
            {/* Teslimat özeti */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t-2 border-dashed border-foreground/25 pt-5 text-xs text-muted-foreground">
              <Link href="/teslimat-politikasi" className="transition-colors hover:text-foreground">
                500 TL üzeri ücretsiz kargo
              </Link>
              <Link href="/iade-politikasi" className="transition-colors hover:text-foreground">
                14 gün iade hakkı
              </Link>
            </div>

            {/* Detaylar */}
            <Accordion type="multiple" className="mt-8 border-t-2 border-dashed border-foreground/25">
              {product.description && (
                <AccordionItem value="aciklama" className="border-b-2 border-dashed border-foreground/25">
                  <AccordionTrigger className="py-4 text-sm hover:no-underline">
                    Açıklama
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="ozellikler" className="border-b-2 border-dashed border-foreground/25">
                <AccordionTrigger className="py-4 text-sm hover:no-underline">
                  Özellikler
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <dl className="divide-y divide-border text-sm">
                    {olcuMetni && (
                      <div className="flex justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">
                          Ölçü
                        </dt>
                        <dd className="tabular-nums">{olcuMetni}</dd>
                      </div>
                    )}
                    {product.materialType && (
                      <div className="flex justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">Malzeme</dt>
                        <dd>{product.materialType}</dd>
                      </div>
                    )}
                    {product.materialWeight && (
                      <div className="flex justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">Ağırlık</dt>
                        <dd className="tabular-nums">{product.materialWeight} g</dd>
                      </div>
                    )}
                    {product.printTimeEst && (
                      <div className="flex justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">Tahmini baskı süresi</dt>
                        <dd className="tabular-nums">{product.printTimeEst} dakika</dd>
                      </div>
                    )}
                    {product.sku && (
                      <div className="flex justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">Stok kodu</dt>
                        <dd className="font-mono text-xs">{product.sku}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 py-2.5">
                      <dt className="text-muted-foreground">Kategori</dt>
                      <dd>{product.category.name}</dd>
                    </div>
                  </dl>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="uretim" className="border-b-2 border-dashed border-foreground/25">
                <AccordionTrigger className="py-4 text-sm hover:no-underline">
                  Üretim
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  Sipariş alındıktan sonra üretime girer. Baskı tamamlandığında
                  destek yapıları temizlenir ve yüzey kontrolünden geçer.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="teslimat" className="border-b-2 border-dashed border-foreground/25">
                <AccordionTrigger className="py-4 text-sm hover:no-underline">
                  Teslimat ve iade
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  Kargo ve teslimat koşulları için{" "}
                  <Link href="/teslimat-politikasi" className="underline underline-offset-4">
                    teslimat politikası
                  </Link>
                  , iade koşulları için{" "}
                  <Link href="/iade-politikasi" className="underline underline-offset-4">
                    iade politikası
                  </Link>{" "}
                  sayfasına bakabilirsin.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Değerlendirmeler */}
        <div className="mt-20 border-t-2 border-dashed border-foreground/25 pt-12">
          <ProductReviews productId={product.id} />
        </div>

        {/* İlgili ürünler */}
        {related.length > 0 && (
          <section className="mt-20 border-t-2 border-dashed border-foreground/25 pt-12" aria-label="İlgili ürünler">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-xl font-medium tracking-tight md:text-2xl">
                {product.category.name} kategorisinden
              </h2>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
              >
                Tümü
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </div>
  );
}
