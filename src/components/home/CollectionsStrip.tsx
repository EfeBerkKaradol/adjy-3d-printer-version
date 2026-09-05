import Link from "next/link";
import { Reveal } from "./Reveal";
import type { HomeCategory } from "./CategoryGrid";
import { ArrowRight, ArrowUpRight } from "lucide-react";

// ==========================================
// BÖLÜM 08 — KOLEKSİYONLAR
// Kart yığını yerine tipografik bir liste: kategori
// adı büyük, ürün sayısı yanında. Yatay kaydırmalı
// kart şeridi yerine dikey liste seçildi — 6 kategori
// için kaydırma gereksiz bir engel olurdu.
// ==========================================

interface CollectionsStripProps {
  categories: HomeCategory[];
}

export function CollectionsStrip({ categories }: CollectionsStripProps) {
  if (categories.length === 0) return null;

  return (
    <section className="adjy-container adjy-section" aria-label="Koleksiyonlar">
      <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="adjy-eyebrow mb-5">Koleksiyonlar</p>
          <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
            Nereye koyacaksın?
          </h2>
        </div>
        <Link
          href="/collections"
          className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
        >
          Tüm koleksiyonlar
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </Reveal>

      <ul className="mt-12 border-t border-border md:mt-16">
        {categories.map((category, i) => (
          <Reveal as="li" key={category.id} index={i} className="border-b border-border">
            <Link
              href={`/products?category=${category.slug}`}
              className="group flex items-baseline justify-between gap-6 py-6 md:py-8"
            >
              <span className="flex items-baseline gap-5">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="adjy-display text-[clamp(1.5rem,3.4vw,2.5rem)] transition-colors group-hover:text-muted-foreground">
                  {category.name}
                </span>
              </span>

              <span className="flex shrink-0 items-baseline gap-5">
                <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
                  {category.productCount} nesne
                </span>
                <ArrowUpRight
                  className="h-5 w-5 self-center text-muted-foreground transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
