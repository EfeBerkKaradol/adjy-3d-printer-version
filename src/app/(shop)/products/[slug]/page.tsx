import { getProductBySlug } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Clock, Package, Layers } from "lucide-react";
import Link from "next/link";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { notFound } from "next/navigation";

// ==========================================
// ÜRÜN DETAY SAYFASI (Server Component)
//
// URL'deki [slug] parametresine göre ürünü
// API'den çeker ve detaylarını gösterir.
//
// Java karşılığı:
//   @GetMapping("/products/{slug}")
//   public String detail(@PathVariable String slug, Model model)
// ==========================================

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;

  // ==========================================
  // [GÖREV 25]: Ürün detayını API'den çek
  //
  // İpucu:
  //   1. try-catch bloğu içinde getProductBySlug(slug) çağır
  //   2. Sonuçtan product'ı al: const { product } = await getProductBySlug(slug)
  //   3. Eğer hata olursa (ürün bulunamadı), notFound() çağır
  //      notFound() Next.js'in 404 sayfasını gösterir.
  //
  // Java karşılığı:
  //   Product product = productService.findBySlug(slug)
  //       .orElseThrow(() -> new NotFoundException("Urun bulunamadi"));
  //
  // ==========================================
  let product: Awaited<ReturnType<typeof getProductBySlug>>["product"];

  try {
    const data = await getProductBySlug(slug);
    product = data.product;
  } catch {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
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
        <div className="aspect-square bg-muted rounded-2xl overflow-hidden flex items-center justify-center">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <div className="text-7xl mb-4">🖨️</div>
              <p className="text-lg">3D Model Gorseli</p>
              <p className="text-sm">(Yakinda eklenecek)</p>
            </div>
          )}
        </div>

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
            {Number(product.basePrice).toFixed(2)} TL
          </div>

          {/* Açıklama */}
          {product.description && (
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          <Separator />

          {/* Teknik Detaylar */}
          <div className="grid grid-cols-2 gap-4">
            {product.printTimeEst && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Baski Suresi</p>
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
                  <p className="text-xs text-muted-foreground">Agirlik</p>
                  <p className="text-sm font-medium">{product.materialWeight}g</p>
                </div>
              </div>
            )}
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

          {/* Sepete Ekle */}
          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              basePrice: Number(product.basePrice),
              thumbnailUrl: product.thumbnailUrl,
            }}
          />
        </div>
      </div>
    </div>
  );
}
