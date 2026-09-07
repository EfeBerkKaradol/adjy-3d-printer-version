"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "./WishlistButton";
import { ProductImageFallback } from "./ProductImageFallback";
import { getPriceInfo, formatPrice } from "@/lib/pricing";
import { ArrowLeft, ArrowRight } from "lucide-react";

// ==========================================
// YATAY ÜRÜN RAYI
//
// Hızlı tüketilen keşif bölümleri için: yeni gelenler
// ve seçili ürünler aynı bileşeni kullanır.
//
// Kaydırma tarayıcının kendi yatay kaydırması —
// JS carousel yok. Mobilde parmakla kayar, masaüstünde
// oklar kaydırır, klavyeyle sekmelenebilir. Snap
// noktaları kartların ortasına oturmasını sağlar.
// ==========================================

export interface RailProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  compareAtPrice: number | null;
  thumbnailUrl: string | null;
  category: { name: string };
  isNew?: boolean;
  isCustomizable?: boolean;
}

interface ProductRailProps {
  products: RailProduct[];
  /** Kart görselinin en-boy oranı */
  aspect?: "square" | "portrait";
}

function RailCard({ product, priority }: { product: RailProduct; priority: boolean }) {
  const [imgError, setImgError] = useState(false);
  const showImage = product.thumbnailUrl && !imgError;
  const price = getPriceInfo(product.basePrice, product.compareAtPrice);

  return (
    <article className="group w-[68vw] shrink-0 snap-start sm:w-[42vw] md:w-[30vw] lg:w-[22vw] xl:w-[18vw]">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-surface-2">
          {showImage ? (
            <Image
              src={product.thumbnailUrl as string}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 68vw, (max-width: 1024px) 30vw, 20vw"
              priority={priority}
              onError={() => setImgError(true)}
              className="adjy-zoom object-cover"
            />
          ) : (
            <ProductImageFallback slug={product.slug} />
          )}

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.isNew && (
              <Badge variant="tech" className="bg-background/90 backdrop-blur-sm">
                Yeni
              </Badge>
            )}
            {price.hasDiscount && (
              <Badge variant="tech" className="bg-background/90 backdrop-blur-sm">
                %{price.percent}
              </Badge>
            )}
          </div>

          <div className="absolute right-2 top-2 z-10 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <WishlistButton productId={product.id} />
          </div>
        </div>

        <div className="pt-3.5">
          <p className="adjy-eyebrow">{product.category.name}</p>
          <h3 className="mt-2 truncate text-sm font-medium tracking-tight">
            {product.name}
          </h3>
          <p className="mt-1.5 flex items-baseline gap-2 text-sm tabular-nums">
            <span className="font-medium">{formatPrice(price.price)}</span>
            {price.compareAt !== null && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(price.compareAt)}
              </span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function ProductRail({ products }: ProductRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    // Görünen genişliğin %80'i kadar kaydır — bir sonraki karta geçer
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        // Yatay kaydırma tarayıcıya bırakılır; dikey scroll bozulmaz
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:-mx-8 md:px-8 xl:-mx-12 xl:px-12 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, i) => (
          <RailCard key={product.id} product={product} priority={i < 3} />
        ))}
      </div>

      {/* Oklar — yalnızca masaüstünde, dokunmatikte gereksiz */}
      {products.length > 3 && (
        <div className="mt-6 hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Önceki ürünler"
            className="flex h-10 w-10 items-center justify-center border border-border transition-colors hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Sonraki ürünler"
            className="flex h-10 w-10 items-center justify-center border border-border transition-colors hover:bg-surface"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
