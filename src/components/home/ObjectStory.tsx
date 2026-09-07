"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useMediaQuery } from "@/hooks/useClientState";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { ScrollScrubVideo } from "./ScrollScrubVideo";
import { STORY_ACTS, STORY_VIDEO, actIndexFor } from "./objectStoryTimeline";
import { ArrowRight } from "lucide-react";

// ==========================================
// BÖLÜM — BİR NESNENİN ÜÇ HÂLİ
//
// Tek bir ürün — delikli duvar paneli — üzerinden
// keşfet → yapılandır → üret anlatısı.
//
// Anlatıyı taşıyan şey metin değil, nesnenin kendisi:
// önceden render edilmiş sinematik bir ürün animasyonu
// kullanıcının kaydırmasıyla kare kare sürülür. Kaydırma
// kaçırılmaz, tekerlek ele geçirilmez; bölüm 200vh, yani
// hikâye birkaç saniyede biter.
//
// Render henüz yokken bölüm ürünün gerçek fotoğrafına
// düşer. Sahte bir sahne üretilmez; STORY_VIDEO'ya dosya
// yolu yazıldığı anda animasyon devralır.
// ==========================================

export interface ObjectStoryProduct {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
}

interface ObjectStoryProps {
  /** Anlatının kahramanı — delikli duvar paneli */
  product: ObjectStoryProduct;
}

export function ObjectStory({ product }: ObjectStoryProps) {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [act, setAct] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = actIndexFor(value);
    setAct((prev) => (prev === next ? prev : next));
  });

  // Masaüstü ve mobil için ayrı dosyalar; biri yoksa diğeri kullanılır
  const videoSrc = isDesktop
    ? STORY_VIDEO.desktop ?? STORY_VIDEO.mobile
    : STORY_VIDEO.mobile ?? STORY_VIDEO.desktop;

  // Render yokken mobilde 200vh boş kaydırma yaptırmanın anlamı yok
  const showStatic = Boolean(reduceMotion) || (!videoSrc && !isDesktop);

  const current = STORY_ACTS[act];

  const stillImage =
    product.thumbnailUrl !== null ? (
      <Image
        src={product.thumbnailUrl}
        alt={product.name}
        fill
        sizes="100vw"
        className="object-cover"
      />
    ) : (
      <ProductImageFallback slug={product.slug} />
    );

  // ------------------------------------------------------------------
  // Hareket azaltma / render'sız mobil: aynı üç hâl, animasyonsuz
  // ------------------------------------------------------------------
  const staticVersion = (
    <section className="adjy-container adjy-section" aria-label="Bir nesnenin üç hâli">
      <div className="max-w-2xl">
        <p className="adjy-eyebrow mb-5">ADJY nedir</p>
        <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
          Bir nesnenin üç hâli.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          ADJY&apos;de bir ürün rafta beklemez. Dosya olarak durur, sen ölçüsünü
          verdiğinde üretilir.
        </p>
      </div>

      <div className="relative mt-10 aspect-[4/3] overflow-hidden bg-surface-2">
        {stillImage}
        <span className="absolute bottom-4 left-4 bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
          {product.name}
        </span>
      </div>

      <ol className="mt-10 divide-y divide-border border-t border-border">
        {STORY_ACTS.map((a) => (
          <li key={a.n} className="py-6">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {a.n}
            </span>
            <h3 className="mt-2.5 text-lg font-medium tracking-tight">{a.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {a.body}
            </p>
            <Link
              href={a.cta.href}
              className="group mt-4 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
            >
              {a.cta.label}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );

  return (
    <div id="adjy-yontem">
      <div className={showStatic ? undefined : "hidden"}>{staticVersion}</div>

      {/* Kapsayıcı her koşulda ağaçta kalır: useScroll'un hedef
          ref'i bir DOM düğümüne bağlı olmak zorunda. */}
      <section
        ref={containerRef}
        className={showStatic ? "hidden" : "relative"}
        style={{ height: "200vh" }}
        aria-label="Bir nesnenin üç hâli"
        aria-hidden={showStatic || undefined}
      >
        <div className="sticky top-0 h-screen overflow-hidden bg-surface-2">
          {/* Taban: ürünün gerçek fotoğrafı. Video çözülene kadar
              görünen kare bu; render hiç yoksa bölüm buna dayanır. */}
          <div className="absolute inset-0">{stillImage}</div>

          {videoSrc && (
            <ScrollScrubVideo
              src={videoSrc}
              progress={scrollYProgress}
              poster={product.thumbnailUrl ?? undefined}
              className="absolute inset-0"
            />
          )}

          {/* Metin, görüntünün alt kenarına yaslanır — ürünün
              üstünü kapatmaz. Perde geçişleri ürünle aynı anda akar. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent pt-24">
            <div className="adjy-container pb-10 md:pb-14">
              <div className="pointer-events-auto max-w-md">
                <motion.div
                  key={current.n}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {current.n}
                  </span>
                  <h2 className="adjy-display mt-2 text-[clamp(1.75rem,3.4vw,2.75rem)]">
                    {current.title}
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                    {current.body}
                  </p>
                  <Link
                    href={current.cta.href}
                    className="group mt-5 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
                  >
                    {current.cta.label}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </motion.div>

                {/* Perde göstergesi */}
                <ol className="mt-8 flex gap-2" aria-hidden>
                  {STORY_ACTS.map((a, i) => (
                    <li
                      key={a.n}
                      className={`h-px transition-all duration-300 ${
                        act === i ? "w-10 bg-foreground" : "w-5 bg-border"
                      }`}
                    />
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <span className="pointer-events-none absolute right-5 top-5 bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm md:right-8">
            {product.name}
          </span>
        </div>
      </section>
    </div>
  );
}
