import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Box, Layers, Zap, ShoppingBag, Users, Star, Sparkles } from "lucide-react";
import { StarBackground } from "@/components/ui/star-background";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/product/ProductCard";
import { WebSiteJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  basePrice: true,
  thumbnailUrl: true,
  featured: true,
  materialType: true,
  printTimeEst: true,
  category: { select: { id: true, name: true, slug: true } },
  reviews: { select: { rating: true } },
  _count: { select: { reviews: true } },
} as const;

// Ana sayfada gösterilecek ürünler: önce öne çıkanlar, yetmezse
// en yeni aktif ürünlerle 8'e tamamlanır.
async function getShowcaseProducts() {
  try {
    const featured = await prisma.product.findMany({
      where: { isActive: true, featured: true },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: PRODUCT_SELECT,
    });

    let products = featured;
    if (products.length < 8) {
      const fillerIds = products.map((p) => p.id);
      const fillers = await prisma.product.findMany({
        where: { isActive: true, id: { notIn: fillerIds } },
        take: 8 - products.length,
        orderBy: { createdAt: "desc" },
        select: PRODUCT_SELECT,
      });
      products = [...products, ...fillers];
    }

    return products.map((p) => {
      const ratings = p.reviews.map((r) => r.rating);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const { reviews: _reviews, ...rest } = p;
      return {
        ...rest,
        basePrice: p.basePrice.toNumber(),
        averageRating: Math.round(avgRating * 10) / 10,
      };
    });
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const [productCount, userCount, orderCount] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.order.count(),
    ]);
    return { productCount, userCount, orderCount };
  } catch {
    return { productCount: 0, userCount: 0, orderCount: 0 };
  }
}

export default async function HomePage() {
  const [showcaseProducts, stats] = await Promise.all([
    getShowcaseProducts(),
    getStats(),
  ]);

  const baseUrl = getAbsoluteUrl();

  return (
    <div className="flex flex-col min-h-screen">
      <WebSiteJsonLd
        name="ADJY - 3D Baski E-Ticaret Platformu"
        url={baseUrl}
        description="3D modelleri parametrik olarak ozellestir, AR ile goruntule ve satin al."
      />

      {/* Kompakt Hero + Ürünler */}
      <section className="relative overflow-hidden bg-background pt-24 md:pt-28 pb-10">
        <StarBackground />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-foreground/5 rounded-full blur-[130px] opacity-30 pointer-events-none" />

        <div className="container relative z-10 mx-auto max-w-7xl px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/40 backdrop-blur-sm px-4 py-1.5 mb-5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Parametrik 3D Baskı · AR Önizleme
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                3D Baskı Ürünlerini{" "}
                <span className="text-gradient">Kendin Tasarla</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Boyut ve rengi özelleştir, AR ile gerçek ortamında gör, hemen sipariş ver.
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              <Button size="lg" className="h-12 px-6 rounded-full glow-white bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105" asChild>
                <Link href="/products">
                  Tüm Ürünler <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 rounded-full border-border/40 bg-background/5 hover:bg-accent backdrop-blur-sm transition-all hover:scale-105" asChild>
                <Link href="/products?featured=true">
                  Öne Çıkanlar
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Ürünler — sayfa açılır açılmaz görünür */}
      {showcaseProducts.length > 0 && (
        <section className="pb-16 md:pb-24 bg-background">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {showcaseProducts.map((product, i) => (
                <div
                  key={product.id}
                  className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                  style={{ animationDelay: `${i * 60}ms`, animationDuration: "600ms" }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                <Link href="/products">
                  Tüm Ürünleri Gör <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* İstatistikler */}
      <section className="py-12 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="text-3xl md:text-4xl font-bold">{stats.productCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Ürün</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-3xl md:text-4xl font-bold">{stats.userCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Kullanıcı</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="h-5 w-5 text-primary" />
                <span className="text-3xl md:text-4xl font-bold">{stats.orderCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Sipariş</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-background relative overflow-hidden">
        <div className="container mx-auto max-w-7xl px-4 relative z-10">
          <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
              Neden <span className="font-[family-name:var(--font-orbitron)] tracking-widest text-foreground">ADJY</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sadece bir e-ticaret sitesi değil, yaratıcılığını gerçeğe dönüştüren bir platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative p-8 rounded-2xl border border-border/40 bg-background/5 backdrop-blur-sm hover:bg-accent/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-foreground/5">
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-16 h-16 mb-6 rounded-2xl bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Box className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-3 relative z-10">
                Parametrik Özelleştirme
              </h3>
              <p className="text-muted-foreground relative z-10">
                Boyut, renk ve deseni istediğin gibi ayarla. Gerçek zamanlı 3D
                önizleme ile sonucu anında gör.
              </p>
            </div>

            <div className="group relative p-8 rounded-2xl border border-border/40 bg-background/5 backdrop-blur-sm hover:bg-accent/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-foreground/5">
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-16 h-16 mb-6 rounded-2xl bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Layers className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-3 relative z-10">AR Görüntüleme</h3>
              <p className="text-muted-foreground relative z-10">
                Telefonunun kamerasını kullanarak ürünü gerçek ortamında
                görüntüle. Boyutları ve görünümü kontrol et.
              </p>
            </div>

            <div className="group relative p-8 rounded-2xl border border-border/40 bg-background/5 backdrop-blur-sm hover:bg-accent/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-foreground/5">
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-16 h-16 mb-6 rounded-2xl bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-3 relative z-10">Kolay Sipariş</h3>
              <p className="text-muted-foreground relative z-10">
                Güvenli ödeme, hızlı üretim ve kargolama. Siparişini adım adım
                takip et ve ürününe kavuş.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
