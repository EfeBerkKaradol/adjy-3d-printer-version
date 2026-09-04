"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

// ==========================================
// BÖLÜM 02 — KATEGORİLER
// Kategori görselleri henüz yüklenmediği için her
// kart, slug'dan türetilen sessiz bir desene düşer.
// Görsel eklendiği anda desen yerini görsele bırakır.
// ==========================================

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

interface CategoryGridProps {
  categories: HomeCategory[];
}

/** Kategoriye özgü, tekrar üretilebilir geometrik zemin */
function CategoryPattern({ index }: { index: number }) {
  const variant = index % 4;

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-2">
      <svg
        viewBox="0 0 160 200"
        className="h-full w-full text-muted-foreground/25"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          {variant === 0 &&
            Array.from({ length: 7 }).map((_, i) => (
              <rect key={i} x={20 + i * 8} y={40 + i * 8} width={120 - i * 16} height={120 - i * 16} />
            ))}
          {variant === 1 &&
            Array.from({ length: 6 }).map((_, r) =>
              Array.from({ length: 5 }).map((_, c) => (
                <circle key={`${r}-${c}`} cx={24 + c * 28} cy={36 + r * 26} r="7" />
              ))
            )}
          {variant === 2 &&
            Array.from({ length: 10 }).map((_, i) => (
              <line key={i} x1={-20 + i * 24} y1="200" x2={60 + i * 24} y2="0" />
            ))}
          {variant === 3 &&
            Array.from({ length: 5 }).map((_, i) => (
              <circle key={i} cx="80" cy="100" r={18 + i * 16} />
            ))}
        </g>
      </svg>
    </div>
  );
}

function CategoryCard({ category, index }: { category: HomeCategory; index: number }) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(category.imageUrl) && !imgError;

  return (
    <Link
      href={`/products?category=${category.slug}`}
      className="group relative block overflow-hidden bg-surface-2"
    >
      <div className="relative aspect-[4/5]">
        {showImage ? (
          <Image
            src={category.imageUrl as string}
            alt=""
            fill
            sizes="(max-width: 640px) 75vw, (max-width: 1024px) 45vw, 30vw"
            onError={() => setImgError(true)}
            className="adjy-zoom object-cover"
          />
        ) : (
          <div className="adjy-zoom h-full w-full">
            <CategoryPattern index={index} />
          </div>
        )}

        {/* Okunabilirlik için alt perde */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/70 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
          <div className="min-w-0">
            <h3 className="text-lg font-medium tracking-tight">{category.name}</h3>
            {category.description && (
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {category.description}
              </p>
            )}
            <p className="adjy-eyebrow mt-2.5">{category.productCount} ürün</p>
          </div>
          <ArrowUpRight
            className="h-5 w-5 shrink-0 translate-y-0 text-muted-foreground transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-foreground"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {categories.map((category, i) => (
        <CategoryCard key={category.id} category={category} index={i} />
      ))}
    </div>
  );
}
