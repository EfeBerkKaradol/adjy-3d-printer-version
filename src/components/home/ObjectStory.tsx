"use client";

import { useRef, useState } from "react";
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
import { STORY_MODULES } from "./objectStoryModules";
import { ArrowRight } from "lucide-react";

// ==========================================
// BÖLÜM — BİR NESNENİN ÜÇ HÂLİ
//
// Tek bir gerçek ürün fotoğrafı (delikli duvar paneli)
// üzerinden kısa bir scroll anlatısı: keşfet →
// yapılandır → üret.
//
// Görsel dil bilinçli olarak sade: 3D sahne, parçacık
// sistemi ya da tel kafes yok. Yalnızca CSS transform ve
// opacity — hepsi GPU'da, scroll'a anında tepki veriyor.
// Yay (spring) kullanılmıyor; kullanıcı hızlı kaydırınca
// animasyon geriden gelmesin diye değerler doğrudan
// ilerlemeye bağlı.
//
// Bölüm 200vh: birkaç tekerlek hareketinde üç hâl de
// görülebilir.
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
    body: "Ölçünü seç. Modüllerini belirle. Kendi sistemini kur.",
    cta: { label: "Yapılandır", href: "/configure" },
  },
  {
    n: "03",
    title: "Üret",
    body: "Sen seç, ADJY üretsin. Tasarladığın şey senin ölçünde üretilir.",
    cta: { label: "Üret", href: "/3d-baski-fiyati-hesapla" },
  },
];

export function ObjectStory({ product }: ObjectStoryProps) {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Ürün görseli: çok hafif yakınlaşma ve kayma.
  // Kamera hissi verir ama dikkati üründen çalmaz.
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.06, 1, 1.03]);
  const imageY = useTransform(scrollYProgress, [0, 1], ["2%", "-2%"]);

  const [act, setAct] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v < 0.32 ? 0 : v < 0.72 ? 1 : 2;
    setAct((prev) => (prev === next ? prev : next));
  });

  const current = ACTS[act];
  const showStatic = Boolean(reduceMotion) || !isDesktop;

  const panel =
    product.thumbnailUrl !== null ? (
      <Image
        src={product.thumbnailUrl}
        alt={product.name}
        fill
        sizes="(max-width: 768px) 100vw, 60vw"
        className="object-cover"
        priority={false}
      />
    ) : (
      <ProductImageFallback slug={product.slug} />
    );

  // ------------------------------------------------------------------
  // Mobil / hareket azaltma: aynı üç hâl, animasyonsuz
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
        {panel}
        <span className="absolute bottom-4 left-4 bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
          {product.name}
        </span>
      </div>

      <ol className="mt-10 divide-y divide-border border-t border-border">
        {ACTS.map((a) => (
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
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="adjy-container grid w-full grid-cols-[minmax(0,4fr)_minmax(0,6fr)] items-center gap-12 lg:gap-20">
            {/* Metin */}
            <div>
              <p className="adjy-eyebrow mb-5">ADJY nedir</p>
              <h2 className="adjy-display text-[clamp(1.875rem,3.6vw,2.75rem)]">
                Bir nesnenin üç hâli.
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                ADJY&apos;de bir ürün rafta beklemez. Dosya olarak durur, sen
                ölçüsünü verdiğinde üretilir.
              </p>

              <div className="mt-10 border-t border-border pt-7">
                <motion.div
                  key={current.n}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {current.n}
                  </span>
                  <h3 className="adjy-display mt-2.5 text-[clamp(1.5rem,2.8vw,2.25rem)]">
                    {current.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                    {current.body}
                  </p>
                  <Link
                    href={current.cta.href}
                    className="group mt-6 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
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
              <ol className="mt-9 flex gap-2" aria-hidden>
                {ACTS.map((a, i) => (
                  <li
                    key={a.n}
                    className={`h-px transition-all duration-300 ${
                      act === i ? "w-10 bg-foreground" : "w-5 bg-border"
                    }`}
                  />
                ))}
              </ol>
            </div>

            {/* Ürün — gerçek fotoğraf, üzerine modüller yerleşiyor */}
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
              <motion.div
                style={{ scale: imageScale, y: imageY }}
                className="absolute inset-0"
              >
                {panel}
              </motion.div>

              {STORY_MODULES.map((mod) => (
                <ModuleOverlay
                  key={mod.id}
                  module={mod}
                  progress={scrollYProgress}
                />
              ))}

              <span className="pointer-events-none absolute bottom-4 left-4 bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                {product.name}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// MODÜL — panele yerleşen parça
//
// Şeffaf ürün görseli varsa o çizilir; yoksa katalogda
// karşılığı olmayan bir ürünün sahte fotoğrafını üretmek
// yerine ince bir etiket işareti gösterilir.
// ==========================================
function ModuleOverlay({
  module: mod,
  progress,
}: {
  module: (typeof STORY_MODULES)[number];
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  // Girişten oturmaya: yaklaşır, belirir, yerine oturur
  const opacity = useTransform(
    progress,
    [mod.enterAt, mod.enterAt + (mod.settleAt - mod.enterAt) * 0.4, 1],
    [0, 1, 1]
  );
  const offsetX = useTransform(progress, [mod.enterAt, mod.settleAt], [26, 0]);
  const offsetY = useTransform(progress, [mod.enterAt, mod.settleAt], [-18, 0]);
  const scale = useTransform(progress, [mod.enterAt, mod.settleAt], [0.9, 1]);

  return (
    <motion.div
      style={{
        opacity,
        x: offsetX,
        y: offsetY,
        scale,
        left: `${mod.x}%`,
        top: `${mod.y}%`,
        width: mod.image ? `${mod.widthPercent}%` : undefined,
      }}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
    >
      {mod.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mod.image} alt={mod.label} className="w-full" />
      ) : (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden />
          <span className="bg-background/90 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
            {mod.label}
          </span>
        </span>
      )}
    </motion.div>
  );
}
