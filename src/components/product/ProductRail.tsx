"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WishlistButton } from "./WishlistButton";
import { ProductImageFallback } from "./ProductImageFallback";
import { getPriceInfo, formatPrice } from "@/lib/pricing";
import { PixelArrow, PixelMoreButton } from "@/components/home/PixelMoreButton";

// ==========================================
// ANA SAYFA ÜRÜN RAFI — PİKSEL KARTLAR
//
// Kategoriler bölümüyle aynı dil: basamaklı köşeli piksel
// çerçeve, kesik çizgili alt şerit, piksel ok. Üzerine gelince
// kart sert gölgesiyle kalkar.
//
// Eskiden yatay kaydırmalı bir raydı; artık kategorilerle aynı
// ızgara: masaüstünde tek sıra 4 kart, telefonda 2×2. Altındaki
// "Daha fazlasını gör" bölümün tam listesine gider.
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
  /** "Daha fazlasını gör" düğmesinin gideceği liste */
  moreHref: string;
  /** Gösterilecek kart sayısı */
  limit?: number;
}

/** Piksel etiket: "YENİ", "%20" */
function Etiket({ children }: { children: React.ReactNode }) {
  return (
    <span className="adjy-pixel-box bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
      {children}
    </span>
  );
}

function RailCard({ product, priority }: { product: RailProduct; priority: boolean }) {
  const [imgError, setImgError] = useState(false);
  const showImage = product.thumbnailUrl && !imgError;
  const price = getPriceInfo(product.basePrice, product.compareAtPrice);

  return (
    <li className="relative">
      <Link href={`/products/${product.slug}`} className="adjy-pixel-card group flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden bg-surface-2">
          {showImage ? (
            <Image
              src={product.thumbnailUrl as string}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              priority={priority}
              onError={() => setImgError(true)}
              className="adjy-zoom object-cover"
            />
          ) : (
            <ProductImageFallback slug={product.slug} />
          )}

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-2">
            {product.isNew && <Etiket>Yeni</Etiket>}
            {price.hasDiscount && <Etiket>%{price.percent}</Etiket>}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-between gap-3 border-t-2 border-dashed border-foreground/80 px-3.5 py-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {product.category.name}
            </p>
            <h3 className="mt-1 truncate text-[15px] font-semibold leading-tight">{product.name}</h3>
            <p className="mt-1 flex items-baseline gap-2 font-mono text-xs tabular-nums">
              <span className="font-semibold">{formatPrice(price.price)}</span>
              {price.compareAt !== null && (
                <span className="text-muted-foreground line-through">{formatPrice(price.compareAt)}</span>
              )}
            </p>
          </div>
          <PixelArrow className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      </Link>

      {/* Favori: bağlantının dışında, kartın sağ üstünde */}
      <div className="absolute right-3 top-3 z-10 opacity-100 transition-opacity duration-200 md:opacity-0 md:[li:hover_&]:opacity-100 md:[li:focus-within_&]:opacity-100">
        <WishlistButton productId={product.id} />
      </div>
    </li>
  );
}

export function ProductRail({ products, moreHref, limit = 4 }: ProductRailProps) {
  if (products.length === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {products.slice(0, limit).map((product, i) => (
          <RailCard key={product.id} product={product} priority={i < 2} />
        ))}
      </ul>
      <PixelMoreButton href={moreHref} />
    </>
  );
}
