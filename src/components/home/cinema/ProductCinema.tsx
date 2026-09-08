"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/hooks/useClientState";
import { CinemaScene } from "./CinemaScene";
import { CAMERA_FOV, CHAPTERS, chapterIndex } from "./timeline";
import { ArrowRight } from "lucide-react";

// ==========================================
// BÖLÜM — ÜRÜNÜN KURULUŞU
//
// Kaydırma, bir ürün filminin zaman çizelgesini sürer.
// Aşağı inince sistem parçalarına ayrılır, bağlantı
// mekanizması görünür, modüller yerlerine takılır ve ürün
// bütünlenir. Yukarı çıkınca aynı şey tersine işler.
//
// Sahne gerçek geometri: levha ekstrüzyonla delinmiş,
// kutuların içi boş, kancanın levha arkasına geçen tırnağı
// var. Hiçbiri görsel taklidi ya da CSS hareketi değil.
// ==========================================

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Sekansın nefes alması için gereken kaydırma payı */
const SECTION_VH = 300;

export interface CinemaProduct {
  id: string;
  name: string;
  slug: string;
}

export function ProductCinema({ product }: { product?: CinemaProduct | null }) {
  const reduceMotion = useReducedMotion();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  const containerRef = useRef<HTMLDivElement>(null);
  // Kaydırma değeri ref'te tutulur: her karede state güncellemek
  // bütün ağacı yeniden render ederdi.
  const progress = useRef(0);

  const [chapter, setChapter] = useState(0);
  const [inView, setInView] = useState(false);

  // ---- Kaydırma → zaman çizelgesi ----------------------------------
  useEffect(() => {
    if (reduceMotion) return;
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const travel = el.offsetHeight - window.innerHeight;
      const p = travel > 0 ? clamp01(-el.getBoundingClientRect().top / travel) : 0;
      progress.current = p;
      const next = chapterIndex(p);
      setChapter((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // İlk ölçüm de kare içinde: effect gövdesinde state güncellenmez
    raf = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  // ---- Sahne yalnızca yaklaşınca kurulur ----------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { rootMargin: "60% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const current = CHAPTERS[chapter];

  const scene = (
    <Canvas
      shadows
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      camera={{
        fov: isMobile ? CAMERA_FOV.mobile : CAMERA_FOV.desktop,
        position: [2.05, 0.8, 7.15],
        near: 0.1,
        far: 80,
      }}
      gl={{ antialias: true }}
      frameloop={reduceMotion ? "demand" : "always"}
      style={{ touchAction: "pan-y" }}
    >
      <CinemaScene
        progress={progress}
        isMobile={isMobile}
        frozenAt={reduceMotion ? 0.97 : undefined}
      />
    </Canvas>
  );

  // ------------------------------------------------------------------
  // Hareket azaltma: aynı ürün, aynı sahne — yalnızca hareketsiz.
  // Kurulmuş hâlin tek karesi gösterilir, anlatı metne düşer.
  // ------------------------------------------------------------------
  if (reduceMotion) {
    return (
      <section id="adjy-yontem" className="adjy-container adjy-section">
        <p className="adjy-eyebrow mb-5">ADJY nedir</p>
        <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
          Modüler tasarım, senin etrafında kurulur.
        </h2>
        <div className="relative mt-10 aspect-[4/3] overflow-hidden bg-surface-2">{scene}</div>
        <ol className="mt-10 divide-y divide-border border-t border-border">
          {CHAPTERS.map((c) => (
            <li key={c.n} className="py-6">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{c.n}</span>
              <h3 className="mt-2.5 text-lg font-medium tracking-tight">{c.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ol>
        <Link
          href="/configure"
          className="group mt-8 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
        >
          Kendi sistemini kur
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </section>
    );
  }

  return (
    <section
      id="adjy-yontem"
      ref={containerRef}
      className="relative"
      style={{ height: `${SECTION_VH}vh` }}
      aria-label="Delikli duvar panelinin kuruluşu"
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-[#DBD8D0]">
        {/* Sahne kadrajın tamamını kaplar; ürün kahraman. */}
        <div className="absolute inset-0">{inView ? scene : null}</div>

        {product && (
          <Link
            href={`/products/${product.slug}`}
            className="absolute right-5 top-5 bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-background md:right-8"
          >
            {product.name}
          </Link>
        )}

        {/* Yazı ikinci planda: köşede, ürünün üstünde değil. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#DBD8D0] via-[#DBD8D0]/80 to-transparent pt-20">
          <div className="adjy-container flex items-end justify-between gap-8 pb-9 md:pb-12">
            <div className="pointer-events-auto max-w-sm">
              <p className="adjy-eyebrow mb-3">ADJY Shopping</p>
              <div key={current.n}>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {current.n}
                </span>
                <h2 className="adjy-display mt-1.5 text-[clamp(1.5rem,2.9vw,2.25rem)]">
                  {current.title}
                </h2>
                <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
                  {current.body}
                </p>
              </div>
              {chapter === CHAPTERS.length - 1 && (
                <Link
                  href="/configure"
                  className="group mt-5 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
                >
                  Kendi sistemini kur
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              )}
            </div>

            {/* Sekansın neresinde olduğunu gösteren ray */}
            <ol className="hidden shrink-0 gap-2 md:flex" aria-hidden>
              {CHAPTERS.map((c, i) => (
                <li
                  key={c.n}
                  className={`h-px transition-all duration-300 ${
                    chapter === i ? "w-10 bg-foreground" : "w-5 bg-foreground/25"
                  }`}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
