"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductImageFallback } from "./ProductImageFallback";
import { cn } from "@/lib/utils";

// ==========================================
// ÜRÜN GALERİSİ
// Ana görsel + küçük görsel şeridi. Şerit yalnızca
// birden fazla görsel varsa çizilir; tek görselde
// gereksiz kontrol gösterilmez.
// ==========================================

interface ProductGalleryProps {
  slug: string;
  name: string;
  images: string[];
}

export function ProductGallery({ slug, name, images }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const usable = images.filter((_, i) => !failed[i]);
  const current = images[index];
  const showImage = Boolean(current) && !failed[index];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {showImage ? (
          <Image
            src={current}
            alt={name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            onError={() => setFailed((f) => ({ ...f, [index]: true }))}
            className="object-cover"
          />
        ) : (
          <ProductImageFallback slug={slug} />
        )}
      </div>

      {usable.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-3" role="tablist" aria-label="Ürün görselleri">
          {images.map((src, i) =>
            failed[i] ? null : (
              <li key={src + i}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`${name} görsel ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "relative aspect-square w-full overflow-hidden bg-surface-2 transition-opacity",
                    i === index
                      ? "ring-1 ring-foreground"
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="120px"
                    onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                    className="object-cover"
                  />
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
