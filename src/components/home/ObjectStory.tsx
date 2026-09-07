"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useMediaQuery } from "@/hooks/useClientState";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { ArrowRight } from "lucide-react";

const ObjectStoryScene = dynamic(() => import("./ObjectStoryScene"), { ssr: false });

// ==========================================
// BÖLÜM — BİR NESNENİN ÜÇ HÂLİ
//
// Tek bir nesne (delikli duvar paneli) scroll boyunca
// keşfedilir, yapılandırılır ve üretilir. Üç ayrı görsel
// değil; kesintisiz tek bir zaman çizelgesi.
//
// Scroll ele geçirilmez: bölüm normal akışta uzun bir
// kapsayıcı, içinde sticky bir sahne. Kullanıcı istediği
// hızda geçebilir, geri sardığında animasyon da geri sarar.
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

const ACTS = [
  {
    n: "01",
    title: "Keşfet",
    body: "Dijital olarak tasarlanmış nesnelere göz at. Her biri bir dosya olarak başlar.",
    cta: { label: "Nesneleri gör", href: "/products" },
  },
  {
    n: "02",
    title: "Yapılandır",
    body: "İhtiyacına göre yeniden şekillendir. Ölçünü seç, modüllerini belirle, kendi sistemini kur.",
    cta: { label: "Yapılandır", href: "/configure" },
  },
  {
    n: "03",
    title: "Üret",
    body: "Tasarladığın şey, senin ölçünde üretilir.",
    cta: { label: "Üret", href: "/3d-baski-fiyati-hesapla" },
  },
];

export function ObjectStory({ product }: ObjectStoryProps) {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Sahne görünür değilken render döngüsü durur
  const [active, setActive] = useState(false);
  const [everSeen, setEverSeen] = useState(false);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        if (entry.isIntersecting) setEverSeen(true);
      },
      { rootMargin: "150px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Yalnızca perde değişiminde render — scroll sırasında değil
  const [act, setAct] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v < 0.36 ? 0 : v < 0.7 ? 1 : 2;
    setAct((prev) => (prev === next ? prev : next));
  });

  const introOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.08], [0, -24]);

  // ------------------------------------------------------------------
  // Hareket azaltılmışsa ya da mobildeyse: aynı üç hâl, animasyonsuz.
  // ------------------------------------------------------------------
  const staticVersion = (
    <section
      className="adjy-container adjy-section"
      aria-label="Bir nesnenin üç hâli"
    >
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

      <div className="relative mt-12 aspect-[4/3] overflow-hidden bg-surface-2">
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover"
          />
        ) : (
          <ProductImageFallback slug={product.slug} />
        )}
        <span className="absolute bottom-4 left-4 bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
          {product.name}
        </span>
      </div>

      <ol className="mt-12 divide-y divide-border border-t border-border">
        {ACTS.map((a) => (
          <li key={a.n} className="py-7">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {a.n}
            </span>
            <h3 className="mt-3 text-xl font-medium tracking-tight">{a.title}</h3>
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

  // Anlatı yerine sabit sürüm gösterilse bile kapsayıcı ağaçta kalır:
  // useScroll'un hedef ref'i bir DOM düğümüne bağlı olmak zorunda.
  const showStatic = Boolean(reduceMotion) || !isDesktop;
  const current = ACTS[act];

  return (
    <div id="adjy-yontem">
      <div className={showStatic ? undefined : "hidden"}>{staticVersion}</div>

      <section
        ref={containerRef}
        className={showStatic ? "hidden" : "relative"}
        style={{ height: "400vh" }}
        aria-label="Bir nesnenin üç hâli"
        aria-hidden={showStatic || undefined}
      >
      <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden">
        {/* Sahne — bölümün ana karakteri */}
        <div className="absolute inset-0">
          {everSeen && !showStatic && (
            <ObjectStoryScene
              progress={scrollYProgress}
              active={active}
              particleCount={180}
            />
          )}
        </div>

        {/* Giriş metni — sahneye yer açmak için yukarı çekilir */}
        <motion.div
          style={{ opacity: introOpacity, y: introY }}
          className="adjy-container pointer-events-none absolute inset-x-0 top-[14vh]"
        >
          <div className="max-w-xl">
            <p className="adjy-eyebrow mb-5">ADJY nedir</p>
            <h2 className="adjy-display text-[clamp(2rem,4.4vw,3.5rem)]">
              Bir nesnenin üç hâli.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              ADJY&apos;de bir ürün rafta beklemez. Dosya olarak durur, sen
              ölçüsünü verdiğinde üretilir.
            </p>
          </div>
        </motion.div>

        {/* Perde metni — sahnenin yanında, editoryal */}
        <div className="adjy-container pointer-events-none absolute inset-x-0 bottom-[12vh]">
          <motion.div
            key={current.n}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-sm"
          >
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {current.n}
            </span>
            <h3 className="adjy-display mt-3 text-[clamp(1.75rem,3.2vw,2.75rem)]">
              {current.title}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {current.body}
            </p>
            <Link
              href={current.cta.href}
              className="group pointer-events-auto mt-5 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
            >
              {current.cta.label}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </motion.div>
        </div>

        {/* Perde göstergesi */}
        <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 lg:block">
          <ol className="flex flex-col gap-4">
            {ACTS.map((a, i) => (
              <li key={a.n} className="flex items-center justify-end gap-3">
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-300 ${
                    act === i ? "text-foreground" : "text-muted-foreground/45"
                  }`}
                >
                  {a.title}
                </span>
                <span
                  className={`h-px transition-all duration-300 ${
                    act === i ? "w-8 bg-foreground" : "w-4 bg-muted-foreground/30"
                  }`}
                />
              </li>
            ))}
          </ol>
        </div>
        </div>
      </section>
    </div>
  );
}
