import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductARButton } from "@/components/ar/ProductARButton";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";
import { getProductType } from "@/lib/productType";
import { AlertCircle, ArrowRight, CheckCircle, Sliders, Star } from "lucide-react";

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

async function getProduct(slug: string) {
  const byId = /^c[a-z0-9]{24,}$/.test(slug);

  const product = await prisma.product.findFirst({
    where: byId ? { id: slug, isActive: true } : { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      description: true,
      basePrice: true,
      thumbnailUrl: true,
      modelFileUrl: true,
      gallery: true,
      printTimeEst: true,
      materialType: true,
      materialWeight: true,
      stockQty: true,
      featured: true,
      category: { select: { id: true, name: true, slug: true } },
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
          affectsPrice: true,
        },
      },
      reviews: { select: { rating: true } },
      _count: { select: { reviews: true } },
    },
  });

  if (!product) return null;

  const ratings = product.reviews.map((r) => r.rating);
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return {
    ...product,
    basePrice: Number(product.basePrice),
    materialWeight: product.materialWeight ? Number(product.materialWeight) : null,
    stockQty: product.stockQty ?? 999,
    reviews: {
      averageRating: Math.round(avgRating * 10) / 10,
      totalCount: product._count.reviews,
    },
  };
}

/** gallery alanı Json — yalnızca string dizisi olduğunda kullanılır */
function readGallery(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) return [];
  return gallery.filter((g): g is string => typeof g === "string" && g.length > 0);
}

async function getRelated(categoryId: string, excludeId: string) {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, categoryId, id: { not: excludeId } },
      take: 4,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        thumbnailUrl: true,
        featured: true,
        category: { select: { name: true, slug: true } },
        _count: { select: { reviews: true, parameters: true } },
      },
    });
    return rows.map((p) => ({ ...p, basePrice: Number(p.basePrice) }));
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

  const description =
    product.description ||
    `${product.name} — ${product.category.name} kategorisinde 3D baskı ürünü. ${product.basePrice.toFixed(2)} TL`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | ADJY`,
      description,
      ...(product.thumbnailUrl && { images: [{ url: product.thumbnailUrl }] }),
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const related = await getRelated(product.category.id, product.id);
  const baseUrl = getAbsoluteUrl();

  const gallery = readGallery(product.gallery);
  const images = [product.thumbnailUrl, ...gallery].filter(
    (src): src is string => Boolean(src)
  );

  // Yalnızca gerçek ölçü parametreleri: sayısal aralığı olan ve
  // renk/metin/seçim tipinde olmayanlar. (COLOR parametreleri
  // min=max=0 ile kaydedildiği için aralık kontrolü şart.)
  const dimensionParams = product.parameters.filter(
    (p) =>
      p.minValue !== null &&
      p.maxValue !== null &&
      p.maxValue > p.minValue &&
      p.type !== "COLOR" &&
      p.type !== "TEXT" &&
      p.type !== "DROPDOWN"
  );
  const isCustomizable = product.parameters.length > 0;
  const inStock = product.stockQty > 0;

  // Modelin (3D önizleme ve AR) varsayılan değerleri
  const defaultParameters = product.parameters.reduce(
    (acc, param) => {
      if (param.type === "COLOR" || param.type === "TEXT" || param.type === "DROPDOWN") {
        acc[param.name] = param.defaultValue;
      } else {
        acc[param.name] = Number(param.defaultValue);
      }
      return acc;
    },
    {} as Record<string, number | string>
  );

  return (
    <div className="pb-20">
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

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Galeri */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery
              slug={product.slug}
              name={product.name}
              images={images}
              modelFileUrl={product.modelFileUrl}
              productType={getProductType(product.slug)}
              defaultParameters={defaultParameters}
            />
          </div>

          {/* Satın alma alanı */}
          <div className="max-w-lg">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/products?category=${product.category.slug}`}
                className="adjy-eyebrow transition-colors hover:text-foreground"
              >
                {product.category.name}
              </Link>
              {isCustomizable && (
                <Badge variant="customizable">Özelleştirilebilir</Badge>
              )}
            </div>

            <h1 className="mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)] font-medium leading-tight tracking-tight">
              {product.name}
            </h1>

            {product.reviews.totalCount > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < Math.round(product.reviews.averageRating)
                          ? "h-3.5 w-3.5 fill-brand-amber text-brand-amber"
                          : "h-3.5 w-3.5 text-muted-foreground/30"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.reviews.averageRating} · {product.reviews.totalCount} değerlendirme
                </span>
              </div>
            )}

            <p className="mt-6 text-2xl font-medium tabular-nums">
              {isCustomizable && (
                <span className="mr-1.5 text-base font-normal text-muted-foreground">
                  Başlangıç
                </span>
              )}
              {product.basePrice.toFixed(2)} TL
            </p>
            {isCustomizable && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Nihai fiyat seçtiğin ölçülere göre konfigüratörde hesaplanır.
              </p>
            )}

            {product.description && (
              <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            {/* Ölçüler */}
            {dimensionParams.length > 0 && (
              <div className="mt-8 border-t border-border pt-6">
                <h2 className="adjy-eyebrow mb-4 text-foreground">
                  Değiştirilebilir ölçüler
                </h2>
                <dl className="divide-y divide-border">
                  {dimensionParams.map((param) => (
                    <div
                      key={param.id}
                      className="flex items-baseline justify-between gap-4 py-2.5"
                    >
                      <dt className="text-sm">{param.displayName}</dt>
                      <dd className="text-sm tabular-nums text-muted-foreground">
                        {param.minValue} – {param.maxValue}
                        {param.unit ? ` ${param.unit}` : ""}
                        <span className="ml-2 text-foreground">
                          (varsayılan {param.defaultValue}
                          {param.unit ? ` ${param.unit}` : ""})
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Stok */}
            <div className="mt-8">
              {!inStock ? (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  Stokta yok
                </p>
              ) : product.stockQty <= 10 ? (
                <p className="flex items-center gap-2 text-sm text-brand-amber">
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  Son {product.stockQty} adet
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-brand-lime" aria-hidden />
                  Stokta
                </p>
              )}
            </div>

            {/* Eylemler */}
            <div className="mt-5 space-y-3">
              {isCustomizable && (
                <Button asChild size="xl" className="w-full">
                  <Link href={`/configure/${product.id}`}>
                    <Sliders className="h-4 w-4" aria-hidden />
                    Ölçüleri özelleştir
                  </Link>
                </Button>
              )}

              {inStock && (
                <AddToCartButton
                  size="xl"
                  variant={isCustomizable ? "outline" : "default"}
                  product={{
                    id: product.id,
                    name: product.name,
                    basePrice: product.basePrice,
                    thumbnailUrl: product.thumbnailUrl,
                  }}
                />
              )}

              {product.parameters.length > 0 && (
                <ProductARButton
                  productId={product.id}
                  productName={product.name}
                  productSlug={product.slug}
                  modelFileUrl={product.modelFileUrl}
                  defaultParameters={defaultParameters}
                />
              )}
            </div>

            {/* Teslimat özeti */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
              <Link href="/teslimat-politikasi" className="transition-colors hover:text-foreground">
                500 TL üzeri ücretsiz kargo
              </Link>
              <Link href="/iade-politikasi" className="transition-colors hover:text-foreground">
                14 gün iade hakkı
              </Link>
            </div>

            {/* Detaylar */}
            <Accordion type="multiple" className="mt-8 border-t border-border">
              {product.description && (
                <AccordionItem value="aciklama" className="border-b border-border">
                  <AccordionTrigger className="py-4 text-sm hover:no-underline">
                    Açıklama
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="ozellikler" className="border-b border-border">
                <AccordionTrigger className="py-4 text-sm hover:no-underline">
                  Özellikler
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <dl className="divide-y divide-border text-sm">
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

              <AccordionItem value="uretim" className="border-b border-border">
                <AccordionTrigger className="py-4 text-sm hover:no-underline">
                  Üretim
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  Sipariş alındıktan sonra üretime girer. Baskı tamamlandığında
                  destek yapıları temizlenir ve yüzey kontrolünden geçer.
                  {isCustomizable &&
                    " Seçtiğin ölçüler modele işlenerek dilimlenir; standart bir stoktan gönderim yapılmaz."}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="teslimat" className="border-b border-border">
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
        <div className="mt-20 border-t border-border pt-12">
          <ProductReviews productId={product.id} />
        </div>

        {/* İlgili ürünler */}
        {related.length > 0 && (
          <section className="mt-20 border-t border-border pt-12" aria-label="İlgili ürünler">
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
