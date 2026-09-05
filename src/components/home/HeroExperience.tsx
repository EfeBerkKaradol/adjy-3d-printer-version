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
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowRight, Sliders } from "lucide-react";

// 3D sahne yalnızca tarayıcıda ve yalnızca gerektiğinde yüklenir.
// Böylece three.js ilk HTML yükünün parçası olmaz.
const HeroObject = dynamic(() => import("./HeroObject"), { ssr: false });

// ==========================================
// BÖLÜM 01 + 02 — HERO VE SCROLL HİKÂYESİ
//
// Kullanıcı scroll ettikçe nesne sabit kalır ve dönüşür:
//   nesne → dijital tasarım → ölçülendirme → senin ölçün → mekân
//
// Anlatının amacı süslemek değil, açıklamak: ziyaretçi ADJY'nin
// ne yaptığını metni okumadan, nesnenin değiştiğini görerek anlar.
//
// Scroll ele geçirilmez (scroll hijacking yok): bölüm normal
// akışta duran uzun bir kapsayıcı ve içinde sticky bir sahne.
// Kullanıcı istediği hızda geçebilir, atlayabilir.
// ==========================================

export interface HeroProduct {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  productType: string;
  category: { name: string };
  /** Modelin sürüleceği genişlik aralığı (mm) */
  widthRange: { min: number; max: number; default: number };
}

interface HeroExperienceProps {
  product: HeroProduct;
}

const STAGES = [
  { label: "Nesne", headline: "Nesneler,\nyeniden." },
  { label: "Tasarım", headline: "Dijital olarak\ntasarlandı." },
  { label: "Ölçü", headline: "Ölçüsünü\nsen belirle." },
  { label: "Mekân", headline: "Alanına göre\nüretildi." },
];

export function HeroExperience({ product }: HeroExperienceProps) {
  const reduceMotion = useReducedMotion();
  // three.js yalnızca masaüstünde indirilsin: CSS ile gizlemek
  // bileşeni mount etmeyi ve chunk'ı indirmeyi engellemez.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Sahne görünür değilken 3D render döngüsü durur
  const [sceneActive, setSceneActive] = useState(false);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSceneActive(entry.isIntersecting),
      { threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- Nesnenin sürülen parametresi ---
  // Genişlik 0.30–0.78 aralığında büyür. Değer 10 mm adımlarına
  // kuantalanır: geometri her karede değil, eşik aşıldığında
  // yeniden kurulur (yaklaşık 20 kez, 60fps'te binlerce kez değil).
  const { min, max, default: defaultWidth } = product.widthRange;
  const startWidth = Math.round(min + (defaultWidth - min) * 0.3);
  const widthMv = useTransform(scrollYProgress, [0.3, 0.78], [startWidth, max]);
  const [width, setWidth] = useState(startWidth);
  useMotionValueEvent(widthMv, "change", (v) => {
    const q = Math.round(v / 10) * 10;
    setWidth((prev) => (prev === q ? prev : q));
  });

  // Dönüş: kaba adımlarla güncellenir, sahnedeki lerp yumuşatır
  const rotationMv = useTransform(scrollYProgress, [0, 1], [-0.35, 0.75]);
  const [rotation, setRotation] = useState(-0.35);
  useMotionValueEvent(rotationMv, "change", (v) => {
    const q = Math.round(v * 40) / 40;
    setRotation((prev) => (prev === q ? prev : q));
  });

  // --- Görsel dönüşümler (ucuz: yalnızca CSS transform/opacity) ---
  const objectScale = useTransform(scrollYProgress, [0, 0.22, 0.78, 1], [0.86, 1, 1, 0.94]);
  const objectX = useTransform(scrollYProgress, [0, 0.3, 1], ["0%", "0%", "-4%"]);
  const dimensionsOpacity = useTransform(
    scrollYProgress,
    [0.26, 0.36, 0.74, 0.82],
    [0, 1, 1, 0]
  );
  // Son aşamada sahne zemini hafifçe koyulaşır (mekân hissi).
  // Renk yerine opaklık animasyonlanır; CSS değişkenleri interpolate edilemez.
  const sceneVeilOpacity = useTransform(scrollYProgress, [0.74, 0.92], [0, 1]);
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.82, 0.93], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.82, 0.93], [16, 0]);

  const [stageIndex, setStageIndex] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = v < 0.22 ? 0 : v < 0.44 ? 1 : v < 0.72 ? 2 : 3;
    setStageIndex((prev) => (prev === i ? prev : i));
  });

  const modelParameters = {
    width,
    height: 120,
    depth: 104,
    color: "#1D1D1B",
  };

  // ------------------------------------------------------------------
  // Hareket azaltılmışsa ya da mobildeyse: aynı hikâye, animasyonsuz.
  // Sabit bir hero + tek ekranda okunabilen üç aşama.
  // ------------------------------------------------------------------
  const renderStaticHero = (alwaysVisible: boolean) => (
    <section
      className={`border-b border-border bg-background ${
        alwaysVisible ? "" : "md:hidden"
      }`}
      aria-labelledby="hero-title-static"
    >
      <div className="adjy-container py-14">
        <p className="adjy-eyebrow mb-5">{product.category.name}</p>
        <h1
          id="hero-title-static"
          className="adjy-display text-[clamp(2.5rem,10vw,3.5rem)]"
        >
          Nesneler,
          <br />
          yeniden.
        </h1>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
          Dijital olarak tasarlandı. Ölçüsünü sen belirle. Alanına göre üretildi.
        </p>

        <div className="relative mt-10 aspect-square overflow-hidden bg-surface-2">
          {product.thumbnailUrl ? (
            <Image
              src={product.thumbnailUrl}
              alt={product.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full" aria-hidden />
          )}
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
            <span className="bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              {product.name}
            </span>
            <span className="bg-background/90 px-2.5 py-1 font-mono text-xs tabular-nums backdrop-blur-sm">
              {min}–{max} mm
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild size="xl">
            <Link href={`/customize/${product.id}`}>
              <Sliders className="h-4 w-4" aria-hidden />
              Kendi nesneni yapılandır
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/products">
              Nesneleri keşfet
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );

  // Hareket azaltma açıkken masaüstünde de sabit sürüm gösterilir
  if (reduceMotion) return renderStaticHero(true);

  return (
    <>
      {renderStaticHero(false)}

      {/* Masaüstü: scroll ile sürülen hikâye */}
      <section
        ref={containerRef}
        className="relative hidden md:block"
        // 4 aşama için yeterli, kullanıcıyı yormayacak kadar kısa.
        // Anlatı zorunlu değil: sağ altta "Anlatıyı atla" var.
        style={{ height: "340vh" }}
        aria-labelledby="hero-title"
      >
        <div
          ref={stageRef}
          className="sticky top-0 h-screen overflow-hidden border-b border-border bg-background"
        >
          <motion.div
            style={{ opacity: sceneVeilOpacity }}
            className="pointer-events-none absolute inset-0 bg-surface-2"
            aria-hidden
          />
          <div className="adjy-container relative grid h-full grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-10">
            {/* Sol — aşama metni */}
            <div className="relative z-10">
              <p className="adjy-eyebrow mb-6">Adaptive Design Joy</p>

              <div className="relative h-[clamp(7rem,15vw,13rem)]">
                {STAGES.map((stage, i) => (
                  <motion.h1
                    key={stage.label}
                    id={i === 0 ? "hero-title" : undefined}
                    aria-hidden={stageIndex !== i}
                    initial={false}
                    animate={{
                      opacity: stageIndex === i ? 1 : 0,
                      y: stageIndex === i ? 0 : 14,
                    }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="adjy-display absolute inset-0 whitespace-pre-line text-[clamp(2.75rem,5.4vw,4.5rem)]"
                  >
                    {stage.headline}
                  </motion.h1>
                ))}
              </div>

              <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
                Katalogdaki nesneler sabit değil. Ölçüsünü değiştir, ADJY senin
                için üretsin.
              </p>

              {/* Son aşamada beliren eylemler */}
              <motion.div
                style={{ opacity: ctaOpacity, y: ctaY }}
                className="mt-9 flex flex-wrap gap-3"
              >
                <Button asChild size="xl">
                  <Link href={`/customize/${product.id}`}>
                    <Sliders className="h-4 w-4" aria-hidden />
                    Bu nesneyi yapılandır
                  </Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <Link href="/products">
                    Nesneleri keşfet
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </motion.div>
            </div>

            {/* Sağ — nesne */}
            <motion.div
              style={{ scale: objectScale, x: objectX }}
              className="relative h-[68vh] max-h-[640px] w-full"
            >
              {isDesktop && (
                <HeroObject
                  parameters={modelParameters}
                  productType={product.productType}
                  targetRotation={rotation}
                  active={sceneActive}
                />
              )}

              {/* Ölçü katmanı — modele beslenen gerçek değeri gösterir */}
              <motion.div
                style={{ opacity: dimensionsOpacity }}
                className="pointer-events-none absolute inset-0"
                aria-hidden
              >
                <svg viewBox="0 0 400 400" className="h-full w-full" fill="none">
                  <g stroke="var(--brand-violet)" strokeWidth="1">
                    <path d="M70 318h260" />
                    <path d="M70 313v10M330 313v10" />
                  </g>
                  <g stroke="var(--brand-violet)" strokeWidth="1" opacity="0.55">
                    <path d="M352 150v130" strokeDasharray="4 4" />
                    <path d="M347 150h10M347 280h10" />
                  </g>
                </svg>

                <div className="absolute bottom-[16%] left-1/2 -translate-x-1/2">
                  <span className="bg-background px-2 py-0.5 font-mono text-xs tabular-nums text-brand-violet">
                    {width} mm
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Sağ kenar — ilerleme rayı */}
          <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 lg:block">
            <ol className="flex flex-col gap-4">
              {STAGES.map((stage, i) => (
                <li key={stage.label} className="flex items-center justify-end gap-3">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-300 ${
                      stageIndex === i ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={`h-px transition-all duration-300 ${
                      stageIndex === i
                        ? "w-8 bg-foreground"
                        : "w-4 bg-muted-foreground/30"
                    }`}
                  />
                </li>
              ))}
            </ol>
          </div>

          {/* Başlangıç ipucu */}
          <motion.div
            style={{ opacity: scrollHintOpacity }}
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 text-xs text-muted-foreground"
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            Keşfetmek için kaydır
          </motion.div>

          {/* Atla — kullanıcı anlatıyı izlemek zorunda değil */}
          <a
            href="#adjy-yontem"
            className="absolute bottom-8 right-8 text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Anlatıyı atla
          </a>
        </div>
      </section>
    </>
  );
}
