"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { ArrowRight, Sliders } from "lucide-react";

// ==========================================
// BÖLÜM 04 — ÖNE ÇIKAN NESNELER
//
// Dört kolonluk grid yerine editoryal bir vitrin:
// solda tek büyük nesne, sağda numaralı liste.
// Listeye dokunmak nesneyi değiştirir — kimse
// animasyon bitsin diye beklemez, her ürün tek
// tıkla erişilebilir.
// ==========================================

export interface FeaturedObject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  category: { name: string };
  isCustomizable: boolean;
}

interface FeaturedObjectsProps {
  products: FeaturedObject[];
}

export function FeaturedObjects({ products }: FeaturedObjectsProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  if (products.length === 0) return null;

  const current = products[active];

  return (
    <section className="adjy-container adjy-section" aria-label="Öne çıkan nesneler">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="adjy-eyebrow mb-5">Öne çıkan nesneler</p>
          <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
            Seçilmiş parçalar.
          </h2>
        </div>
        <Link
          href="/products"
          className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
        >
          Tümünü keşfet
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 md:mt-16">
        {/* Büyük nesne */}
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-2 lg:aspect-[5/4]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={reduceMotion ? false : { opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {current.thumbnailUrl ? (
                <Image
                  src={current.thumbnailUrl}
                  alt={current.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover"
                />
              ) : (
                <ProductImageFallback slug={current.slug} />
              )}
            </motion.div>
          </AnimatePresence>

          <span className="absolute left-4 top-4 font-mono text-xs tabular-nums text-muted-foreground">
            {String(active + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
          </span>
        </div>

        {/* Bilgi + liste */}
        <div className="flex flex-col">
          <div className="min-h-[13rem]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="adjy-eyebrow">{current.category.name}</span>
              {current.isCustomizable && (
                <Badge variant="customizable">Özelleştirilebilir</Badge>
              )}
            </div>
            <h3 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">
              {current.name}
            </h3>
            {current.description && (
              <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">
                {current.description}
              </p>
            )}
            <p className="mt-5 text-lg tabular-nums">
              {current.isCustomizable && (
                <span className="text-sm text-muted-foreground">Başlangıç </span>
              )}
              <span className="font-medium">{current.basePrice.toFixed(2)} TL</span>
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {current.isCustomizable ? (
                <Button asChild>
                  <Link href={`/configure/${current.id}`}>
                    <Sliders className="h-4 w-4" aria-hidden />
                    Yapılandır
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/products/${current.slug}`}>Nesneyi incele</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href={`/products/${current.slug}`}>Detaylar</Link>
              </Button>
            </div>
          </div>

          {/* Numaralı seçim listesi */}
          <ul className="mt-10 divide-y divide-border border-t border-border">
            {products.map((product, i) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  aria-current={i === active ? "true" : undefined}
                  className={`flex w-full items-center gap-4 py-3 text-left transition-colors ${
                    i === active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-mono text-xs tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 truncate text-sm">{product.name}</span>
                  <span
                    className={`h-px transition-all duration-300 ${
                      i === active ? "w-8 bg-foreground" : "w-3 bg-border"
                    }`}
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
