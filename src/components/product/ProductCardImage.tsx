"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductImageFallback } from "./ProductImageFallback";

// ==========================================
// KART GÖRSELİ — İKİNCİ GÖRSEL "BASILIR"
//
// Kapak görselinin üstünde ikinci görsel gizli bekler. Kartın
// üzerine gelince kategorilerdeki piksel nesneler gibi alttan
// yukarı, katman katman basılarak belirir (globals.css:
// .adjy-print-swap). İkinci görsel yoksa kapak sabit kalır.
// Kapsayıcının `group` sınıfı taşıması gerekir.
// ==========================================

interface Props {
  slug: string;
  name: string;
  src: string | null;
  hoverSrc?: string | null;
  sizes: string;
  priority?: boolean;
}

export function ProductCardImage({ slug, name, src, hoverSrc, sizes, priority }: Props) {
  const [hata, setHata] = useState(false);
  const [ikinciHata, setIkinciHata] = useState(false);

  if (!src || hata) return <ProductImageFallback slug={slug} />;

  return (
    <>
      <Image
        src={src}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setHata(true)}
        className="object-cover"
      />
      {hoverSrc && !ikinciHata && (
        <>
          <Image
            src={hoverSrc}
            alt=""
            aria-hidden
            fill
            sizes={sizes}
            onError={() => setIkinciHata(true)}
            className="adjy-print-swap object-cover"
          />
          <span
            aria-hidden
            className="adjy-print-nozzle pointer-events-none absolute inset-x-0 h-[3px] bg-foreground shadow-[0_-2px_0_var(--background)]"
          />
        </>
      )}
    </>
  );
}
