import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Clock, Package, Layers, Box, Hash, AlertCircle, CheckCircle, Truck } from "lucide-react";
import Link from "next/link";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductDetailImage } from "@/components/product/ProductDetailImage";
import { ProductARButton } from "@/components/ar/ProductARButton";
import { ProductReviews } from "@/components/product/ProductReviews";
import { notFound } from "next/navigation";
import { ProductJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

// Ürünü Prisma ile doğrudan çek (API fetch yerine)
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
          priceFormula: true,
          affectsGeometry: true,
          sortOrder: true,
        },
      },
      reviews: { select: { rating: true } },
      _count: { select: { reviews: true } },
    },
  });

  if (!product) return null;

  const ratings = product.reviews.map((r) => r.rating);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

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

// Dinamik SEO metadata
export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: "Ürün Bulunamadı" };

  return {
    title: product.name,
    description: product.description || `${product.name} - ${product.category.name} kategorisinde 3D baskı ürünü. ${product.basePrice.toFixed(2)} TL`,
    openGraph: {
      title: `${product.name} | ADJY`,
      description: product.description || `${product.name} - ${product.basePrice.toFixed(2)} TL`,
      ...(product.thumbnailUrl && { images: [{ url: product.thumbnailUrl }] }),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const baseUrl = getAbsoluteUrl();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
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
            ? { average: product.reviews.averageRating, count: product.reviews.totalCount }
            : undefined
        }
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/products" className="hover:text-foreground transition-colors">
          Urunler
        </Link>
        <span>/</span>
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Sol: Ürün Görseli */}
        <ProductDetailImage
          slug={product.slug}
          name={product.name}
          thumbnailUrl={product.thumbnailUrl}
        />

        {/* Sağ: Ürün Bilgileri */}
        <div className="space-y-6">
          {/* Başlık + Kategori */}
          <div>
            <Badge variant="secondary" className="mb-3">
              {product.category.name}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

            {/* Yıldız + Yorum */}
            {product.reviews.totalCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(product.reviews.averageRating)
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.reviews.totalCount} yorum)
                </span>
              </div>
            )}
          </div>

          {/* Fiyat */}
          <div className="text-4xl font-bold text-primary">
            {product.basePrice.toFixed(2)} TL
          </div>

          {/* Açıklama */}
          {product.description && (
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          <Separator />

          {/* Stok Durumu */}
          {product.stockQty <= 10 && product.stockQty > 0 ? (
            <div className="flex items-center gap-2 text-amber-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Son {product.stockQty} adet kaldı!</span>
            </div>
          ) : product.stockQty > 10 ? (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Stokta mevcut</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Stok tükendi</span>
            </div>
          )}

          {/* Teknik Detaylar */}
          <div className="grid grid-cols-2 gap-4">
            {product.printTimeEst && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Baskı Süresi</p>
                  <p className="text-sm font-medium">{product.printTimeEst} dakika</p>
                </div>
              </div>
            )}
            {product.materialType && (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Materyal</p>
                  <p className="text-sm font-medium">{product.materialType}</p>
                </div>
              </div>
            )}
            {product.materialWeight && (
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Ağırlık</p>
                  <p className="text-sm font-medium">{product.materialWeight}g</p>
                </div>
              </div>
            )}
            {product.sku && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Stok Kodu</p>
                  <p className="text-sm font-medium font-mono">{product.sku}</p>
                </div>
              </div>
            )}
          </div>

          {/* Teslimat & İade Özet */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <Link href="/teslimat-politikasi" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Truck className="h-3 w-3" />
              500 TL üzeri ücretsiz kargo · 2–5 iş günü teslimat
            </Link>
            <Link href="/iade-politikasi" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <CheckCircle className="h-3 w-3" />
              14 gün iade hakkı
            </Link>
          </div>

          {/* Parametreler */}
          {product.parameters.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Ozellestirme Parametreleri</h3>
                <div className="space-y-3">
                  {product.parameters.map((param) => (
                    <div
                      key={param.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">{param.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          Varsayilan: {param.defaultValue}
                          {param.unit && ` ${param.unit}`}
                        </p>
                      </div>
                      <div className="text-right">
                        {param.type === "SLIDER" && param.minValue !== null && param.maxValue !== null && (
                          <p className="text-xs text-muted-foreground">
                            {param.minValue} - {param.maxValue}
                            {param.unit && ` ${param.unit}`}
                          </p>
                        )}
                        {param.affectsPrice && (
                          <Badge variant="outline" className="text-[10px]">
                            Fiyati etkiler
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* 3D Ozellestir + AR + Sepete Ekle */}
          {product.parameters.length > 0 && (
            <div className="space-y-3">
              <Link
                href={`/customize/${product.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                <Box className="h-5 w-5" />
                3D Ozellestir
              </Link>

              <ProductARButton
                productId={product.id}
                productName={product.name}
                productSlug={product.slug}
                modelFileUrl={product.modelFileUrl}
                defaultParameters={product.parameters.reduce(
                  (acc, param) => {
                    if (param.type === "COLOR" || param.type === "TEXT" || param.type === "DROPDOWN") {
                      acc[param.name] = param.defaultValue;
                    } else {
                      acc[param.name] = Number(param.defaultValue);
                    }
                    return acc;
                  },
                  {} as Record<string, number | string>
                )}
              />
            </div>
          )}

          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              basePrice: product.basePrice,
              thumbnailUrl: product.thumbnailUrl,
            }}
          />
        </div>
      </div>

      {/* Değerlendirmeler */}
      <ProductReviews productId={product.id} />
    </div>
  );
}
