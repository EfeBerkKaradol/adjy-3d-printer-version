"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { ScaleDiagram } from "./ScaleDiagram";
import { ArrowRight } from "lucide-react";

// ==========================================
// BÖLÜM 06 — ALANINA GÖRE
//
// "Bu nesne benim alanımda nasıl durur?" sorusunu
// yanıtlar. Kullanım senaryoları gerçek kategorilere
// bağlıdır; her sekme o kategoriden gerçek bir ürün
// gösterir ve kategoriye götürür.
//
// Sahte bir yaşam alanı görseli ya da ölçeği yanlış bir
// 3D oda yerine, ürünün gerçek ölçü aralığı A4 kâğıtla
// aynı ölçekte çizilir. Ziyaretçi büyüklüğü tahmin
// etmez, karşılaştırarak görür.
// ==========================================

export interface SpaceScene {
  /** Sekme adı — kullanım senaryosu */
  label: string;
  categoryName: string;
  categorySlug: string;
  product: {
    name: string;
    slug: string;
    thumbnailUrl: string | null;
  };
  /** Değiştirilebilir genişlik — ölçek çizimi bundan beslenir */
  width: {
    min: number;
    max: number;
    default: number;
    label: string;
  } | null;
}

interface SpaceShowcaseProps {
  scenes: SpaceScene[];
}

export function SpaceShowcase({ scenes }: SpaceShowcaseProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  if (scenes.length === 0) return null;
  const scene = scenes[Math.min(active, scenes.length - 1)];

  return (
    <section className="border-y border-border bg-surface-2" aria-label="Alanına göre">
      <div className="adjy-container adjy-section">
        <div className="max-w-2xl">
          <p className="adjy-eyebrow mb-5">Alanına göre</p>
          <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
            Nesne mekâna uyar,
            <br />
            mekân nesneye değil.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Rafın duvarına, standın masana, kutun rafına göre üretilir. Ölçüyü
            sen verirsin; hazır bir boyuta razı olmazsın.
          </p>
        </div>

        {/* Senaryo sekmeleri */}
        <div
          role="tablist"
          aria-label="Kullanım senaryoları"
          className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-b border-border pb-4"
        >
          {scenes.map((s, i) => (
            <button
              key={s.categorySlug}
              role="tab"
              type="button"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`relative pb-1 text-sm transition-colors ${
                i === active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
              {i === active && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "space-tab"}
                  className="absolute -bottom-[17px] left-0 h-px w-full bg-foreground"
                />
              )}
            </button>
          ))}
        </div>

        {/* Sahne */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          <div className="relative aspect-[16/10] overflow-hidden bg-surface">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={scene.categorySlug}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {scene.product.thumbnailUrl ? (
                  <Image
                    src={scene.product.thumbnailUrl}
                    alt={scene.product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                  />
                ) : (
                  <ProductImageFallback slug={scene.product.slug} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col justify-center">
            <p className="adjy-eyebrow">{scene.categoryName}</p>
            <h3 className="mt-3 text-xl font-medium tracking-tight md:text-2xl">
              {scene.product.name}
            </h3>

            {scene.width ? (
              <div className="mt-7 border-t border-border pt-6">
                <p className="adjy-eyebrow mb-4">
                  {scene.width.label} · {scene.width.min}–{scene.width.max} mm
                </p>
                <ScaleDiagram
                  min={scene.width.min}
                  max={scene.width.max}
                  current={scene.width.default}
                  label={scene.product.name}
                />
              </div>
            ) : (
              <p className="mt-7 border-t border-border pt-6 text-sm text-muted-foreground">
                Bu ürün sabit ölçüde üretilir.
              </p>
            )}

            <div className="mt-8 flex flex-col items-start gap-3">
              <Link
                href={`/products/${scene.product.slug}`}
                className="group inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
              >
                Bu nesneyi incele
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href={`/products?category=${scene.categorySlug}`}
                className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {scene.categoryName} koleksiyonunu gör
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
