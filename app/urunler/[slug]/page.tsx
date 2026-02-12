"use client";

import { useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Smartphone,
  Shield,
  Truck,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThreeViewerPlaceholder } from "@/components/product/three-viewer-placeholder";
import { ProductCard } from "@/components/product/product-card";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/common/motion";
import { SectionHeading } from "@/components/common/section-heading";
import { useCart } from "@/contexts/cart-context";
import { mockProducts } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const product = mockProducts.find((p) => p.slug === slug) || mockProducts[0];
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"details" | "reviews" | "shipping">("details");
  const [selectedDimension, setSelectedDimension] = useState({
    width: product.dimensions.width,
    height: product.dimensions.height,
    depth: product.dimensions.depth,
  });

  const relatedProducts = mockProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  const handleAddToCart = () => {
    addItem(product, quantity);
  };

  return (
    <div className="min-h-screen pt-20 lg:pt-24">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Ana Sayfa</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/urunler" className="hover:text-foreground transition-colors">Urunler</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-48">{product.name}</span>
        </nav>

        {/* Product content */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left - 3D Viewer */}
          <ScrollReveal>
            <ThreeViewerPlaceholder />

            {/* AR Button */}
            {product.hasAR && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4"
              >
                <Button
                  variant="outline"
                  className="w-full gap-2 border-accent/30 text-accent hover:bg-accent/10"
                >
                  <Smartphone className="h-4 w-4" />
                  AR ile Mekaninizda Goruntuleyin
                </Button>
              </motion.div>
            )}
          </ScrollReveal>

          {/* Right - Product Info */}
          <div>
            <ScrollReveal>
              {/* Badges */}
              <div className="mb-3 flex items-center gap-2">
                {product.has3DModel && (
                  <Badge variant="gradient">3D Model</Badge>
                )}
                {product.hasAR && (
                  <Badge variant="secondary">AR Uyumlu</Badge>
                )}
                {product.originalPrice && (
                  <Badge className="bg-destructive/90 text-destructive-foreground">
                    %{Math.round((1 - product.price / product.originalPrice) * 100)} Indirim
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold tracking-tight font-heading md:text-3xl lg:text-4xl text-balance">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < Math.floor(product.rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount} degerlendirme)
                </span>
              </div>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground md:text-4xl">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Short description */}
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              {/* Dimension controls (for customizable products) */}
              {product.has3DModel && (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold">Boyut Ayarlari (mm)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(["width", "height", "depth"] as const).map((dim) => (
                      <div key={dim} className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground capitalize">
                          {dim === "width" ? "Genislik" : dim === "height" ? "Yukseklik" : "Derinlik"}
                        </label>
                        <input
                          type="range"
                          min={Math.floor(product.dimensions[dim] * 0.5)}
                          max={Math.floor(product.dimensions[dim] * 1.5)}
                          value={selectedDimension[dim]}
                          onChange={(e) =>
                            setSelectedDimension((prev) => ({
                              ...prev,
                              [dim]: Number(e.target.value),
                            }))
                          }
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-accent"
                        />
                        <span className="text-xs font-medium text-center">
                          {selectedDimension[dim]}mm
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Add to cart */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center rounded-lg border border-border">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-secondary"
                    aria-label="Azalt"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-11 w-12 items-center justify-center border-x border-border text-sm font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-secondary"
                    aria-label="Artir"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  variant="gradient"
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {product.inStock ? "Sepete Ekle" : "Stokta Yok"}
                </Button>

                <Button variant="outline" size="lg" className="w-11 p-0" aria-label="Favorilere ekle">
                  <Heart className="h-5 w-5" />
                </Button>

                <Button variant="outline" size="lg" className="w-11 p-0" aria-label="Paylas">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { icon: Shield, label: "Guvenli Odeme" },
                  { icon: Truck, label: "Ucretsiz Kargo" },
                  { icon: RotateCcw, label: "14 Gun Iade" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-secondary/30 p-3 text-center"
                  >
                    <item.icon className="h-4 w-4 text-accent" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16">
          <div className="flex gap-1 border-b border-border">
            {[
              { key: "details", label: "Ozellikler" },
              { key: "reviews", label: `Yorumlar (${product.reviewCount})` },
              { key: "shipping", label: "Teslimat Bilgileri" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="activeProductTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gradient-start to-gradient-end"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === "details" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-4 text-base font-semibold font-heading">Teknik Ozellikler</h3>
                  <dl className="flex flex-col gap-3">
                    {[
                      { label: "Malzeme", value: product.material },
                      { label: "Boyutlar", value: `${product.dimensions.width} x ${product.dimensions.height} x ${product.dimensions.depth} mm` },
                      { label: "Kategori", value: product.category.replace("-", " ") },
                      { label: "Baski Suresi", value: product.printTime },
                    ].map((spec) => (
                      <div key={spec.label} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                        <dt className="text-sm text-muted-foreground">{spec.label}</dt>
                        <dd className="text-sm font-medium capitalize">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-4 text-base font-semibold font-heading">Aciklama</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Star className="mb-4 h-12 w-12 text-muted-foreground/20" />
                <h3 className="mb-2 text-lg font-medium">Henuz yorum yok</h3>
                <p className="text-sm text-muted-foreground">Bu urunu ilk degerlendiren siz olun!</p>
                <Button variant="outline" className="mt-4">Yorum Yaz</Button>
              </div>
            )}

            {activeTab === "shipping" && (
              <div className="max-w-2xl rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-base font-semibold font-heading">Teslimat Bilgileri</h3>
                <div className="flex flex-col gap-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 h-5 w-5 text-accent shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Standart Kargo</p>
                      <p>Turkiye genelinde 2-4 is gunu. 500 TL uzeri siparislerde ucretsiz.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RotateCcw className="mt-0.5 h-5 w-5 text-accent shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Iade Politikasi</p>
                      <p>Teslim tarihinden itibaren 14 gun icerisinde kosulsuz iade hakki. Kisiye ozel uretim urunleri haricdir.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-8 border-t border-border pt-16">
            <ScrollReveal>
              <SectionHeading
                title="Benzer Urunler"
                subtitle="Bu urunu begendiniz mi? Benzer urunlerimize de goz atin."
              />
            </ScrollReveal>
            <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        )}
      </div>
    </div>
  );
}
