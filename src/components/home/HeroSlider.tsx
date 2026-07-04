"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight, Box, Sparkles } from "lucide-react";

// ==========================================
// HERO ÜRÜN SLIDER
// Öne çıkan ürünleri büyük, otomatik dönen bir
// carousel içinde gösterir. Her slayt: görsel +
// ürün bilgisi + CTA. Altındaki ürün listesi
// slider görünürken de kısmen görünür kalır.
// ==========================================

interface SlideProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  category: { name: string; slug: string };
}

interface HeroSliderProps {
  products: SlideProduct[];
}

// Slug'a göre yumuşak degrade (görsel yoksa placeholder arkaplanı)
function slideGradient(slug: string): string {
  if (slug.includes("vazo") || slug.includes("kase")) return "from-violet-500/20 to-purple-600/10";
  if (slug.includes("stand") || slug.includes("telefon")) return "from-blue-500/20 to-indigo-600/10";
  if (slug.includes("lamba")) return "from-amber-400/20 to-yellow-500/10";
  if (slug.includes("eriyen") || slug.includes("raf")) return "from-slate-400/20 to-slate-600/10";
  if (slug.includes("depolama") || slug.includes("kutu")) return "from-emerald-400/20 to-teal-600/10";
  return "from-foreground/10 to-foreground/5";
}

export function HeroSlider({ products }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = products.length;

  const goTo = useCallback((i: number) => {
    setCurrent(((i % count) + count) % count);
  }, [count]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Otomatik ilerleme (5sn), hover'da durur
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || count <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % count);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <section
      className="relative w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative h-[62vh] min-h-[440px] max-h-[640px] overflow-hidden rounded-b-3xl border-b border-border/40">
        {products.map((product, i) => {
          const active = i === current;
          return (
            <div
              key={product.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
              aria-hidden={!active}
            >
              {/* Arkaplan degrade */}
              <div className={`absolute inset-0 bg-gradient-to-br ${slideGradient(product.slug)}`} />
              <div className="absolute inset-0 bg-background/40" />

              <div className="relative z-10 h-full container mx-auto max-w-7xl px-4">
                <div className="grid h-full grid-cols-1 md:grid-cols-2 items-center gap-8">
                  {/* Metin tarafı */}
                  <div className={`max-w-xl ${active ? "animate-in fade-in slide-in-from-left-8 duration-700" : ""}`}>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm px-3 py-1 mb-4 text-xs font-medium text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      {product.category.name}
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                      {product.name}
                    </h2>
                    {product.description && (
                      <p className="text-base md:text-lg text-muted-foreground mb-6 line-clamp-3 max-w-md">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mb-8">
                      <span className="text-2xl md:text-3xl font-bold text-primary">
                        {product.basePrice.toFixed(2)} TL
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button size="lg" className="h-12 px-6 rounded-full glow-white bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105" asChild>
                        <Link href={`/products/${product.slug}`}>
                          İncele <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="lg" variant="outline" className="h-12 px-6 rounded-full border-border/40 bg-background/20 backdrop-blur-sm hover:bg-accent transition-all hover:scale-105" asChild>
                        <Link href="/products">Tüm Ürünler</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Görsel tarafı — dikeyde ortalı, sabit yükseklik ile dengeli üst/alt boşluk */}
                  <div className={`hidden md:flex items-center justify-center h-full pb-8 ${active ? "animate-in fade-in slide-in-from-right-8 duration-700" : ""}`}>
                    <div className="relative aspect-square h-[300px] lg:h-[360px] w-auto max-w-full rounded-3xl overflow-hidden border border-border/40 bg-background/30 backdrop-blur-sm shadow-2xl">
                      {product.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Box className="w-24 h-24 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Sol / Sağ oklar */}
        {count > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Önceki ürün"
              className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm items-center justify-center hover:bg-accent transition-all hover:scale-110"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Sonraki ürün"
              className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm items-center justify-center hover:bg-accent transition-all hover:scale-110"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Nokta göstergeleri */}
        {count > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => goTo(i)}
                aria-label={`${i + 1}. ürüne git`}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
