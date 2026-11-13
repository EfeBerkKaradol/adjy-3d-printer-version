"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";

// ==========================================
// SİPARİŞTEN KAPINIZA
//
// Karşılamanın hemen altındaki bölüm. Eskiden burada başlık,
// paragraf ve ürün kareleri vardı; artık yalnızca sipariş sürecini
// yukarıdan aşağı, kronolojik bir zaman çizelgesi olarak anlatıyor.
// Az yazı: her adımda bir başlık ve tek kısa satır.
//
// Görsel dil karşılamadaki yazıcıyla aynı: piksel ikonlar, kare
// düğümler. Kaydırdıkça ortadaki çizgi dolar, ulaşılan adımların
// düğümü dolar. Hareket azaltma açıksa çizgi baştan dolu gelir.
//
// Süreler teslimat politikası ve SSS ile aynı: üretim 2–5 iş günü,
// Yurtiçi Kargo 1–3 iş günü, 500 TL üzeri kargo ücretsiz.
// ==========================================

/** 10×10 piksel ikonlar: "#" dolu, "." boş */
const IKON: Record<string, string[]> = {
  sec: [
    "..####....",
    ".#....#...",
    "#......#..",
    "#......#..",
    "#......#..",
    "#......#..",
    ".#....#...",
    "..####.#..",
    ".......##.",
    "........##",
  ],
  olc: [
    "##########",
    "#.#.#.#.##",
    "#.#.#.#.##",
    "#.#...#..#",
    "#........#",
    "##########",
    "..........",
    "#........#",
    "##########",
    "#........#",
  ],
  ode: [
    "..........",
    "##########",
    "#........#",
    "##########",
    "##########",
    "#........#",
    "#.###....#",
    "#........#",
    "##########",
    "..........",
  ],
  bas: [
    "##########",
    "#........#",
    "#.######.#",
    "#...##...#",
    "#....#...#",
    "#........#",
    "#..####..#",
    "#..####..#",
    "##########",
    "##########",
  ],
  kargo: [
    "..........",
    "##########",
    "#...##...#",
    "#...##...#",
    "##########",
    "#........#",
    "#........#",
    "#.###....#",
    "#........#",
    "##########",
  ],
  ev: [
    "....##....",
    "...####...",
    "..##..##..",
    ".##....##.",
    "##......##",
    ".#......#.",
    ".#.##...#.",
    ".#.##...#.",
    ".#.##...#.",
    ".########.",
  ],
};

const ADIMLAR: { ikon: keyof typeof IKON; baslik: string; satir: string }[] = [
  { ikon: "sec", baslik: "Seçin", satir: "Katalogdan beğendiğiniz ürünü bulun." },
  { ikon: "olc", baslik: "Ölçüyü belirleyin", satir: "Boyutu ve rengi alanınıza göre ayarlayın." },
  { ikon: "ode", baslik: "Sipariş verin", satir: "3D Secure ile güvenli ödeme." },
  { ikon: "bas", baslik: "Atölyede basılır", satir: "Katman katman, 2–5 iş günü." },
  { ikon: "kargo", baslik: "Kargoya verilir", satir: "Takip numarası e-postanızda." },
  { ikon: "ev", baslik: "Kapınızda", satir: "1–3 iş günü. 500 TL üzeri kargo ücretsiz." },
];

function PikselIkon({ ad, className }: { ad: keyof typeof IKON; className?: string }) {
  const harita = IKON[ad];
  return (
    <svg
      viewBox="0 0 10 10"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden
      fill="currentColor"
    >
      {harita.flatMap((satir, y) =>
        [...satir].map((ch, x) => (ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null))
      )}
    </svg>
  );
}

const RM_QUERY = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(RM_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(RM_QUERY).matches,
    () => false
  );
}

/** Çizgi bu adıma ulaştığında düğüm dolar */
function Dugum({ ilerleme, esik, reduce }: { ilerleme: MotionValue<number>; esik: number; reduce: boolean }) {
  const dolu = useTransform(ilerleme, (v) => (v >= esik ? 1 : 0));
  return (
    <span className="relative block h-4 w-4 border-2 border-foreground bg-background">
      <motion.span
        className="absolute inset-[2px] bg-foreground"
        style={reduce ? { opacity: 1 } : { opacity: dolu }}
      />
    </span>
  );
}

export function OrderJourney() {
  const reduce = usePrefersReducedMotion();
  const listeRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: listeRef,
    offset: ["start 75%", "end 60%"],
  });
  const ilerleme = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });

  return (
    // id: karşılamadaki "Kaydır" bağlantısı buraya iner
    <section id="vitrin" aria-labelledby="surec-baslik" className="adjy-container scroll-mt-24 py-16 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="adjy-eyebrow text-center">Nasıl çalışır</p>
        <h2
          id="surec-baslik"
          className="adjy-display mt-4 text-center text-[clamp(1.9rem,4vw,3rem)]"
        >
          Siparişten kapınıza
        </h2>

        <ol ref={listeRef} className="relative mt-14 lg:mt-20">
          {/* Arka çizgi ve kaydırdıkça dolan çizgi */}
          <span
            aria-hidden
            className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-[repeating-linear-gradient(to_bottom,var(--border)_0_6px,transparent_6px_10px)] md:left-1/2 md:-translate-x-1/2"
          />
          <motion.span
            aria-hidden
            className="absolute bottom-2 left-[7px] top-2 w-0.5 origin-top bg-foreground md:left-1/2 md:-translate-x-1/2"
            style={{ scaleY: reduce ? 1 : ilerleme }}
          />

          {ADIMLAR.map((a, i) => {
            const sag = i % 2 === 1;
            const esik = i / (ADIMLAR.length - 1) - 0.02;
            return (
              <li
                key={a.ikon}
                className="relative grid grid-cols-[16px_1fr] gap-x-5 pb-12 last:pb-0 md:grid-cols-[1fr_16px_1fr] md:gap-x-10 md:pb-16"
              >
                {/* Masaüstünde adımlar sağ-sol sırayla dizilir */}
                <div
                  className={
                    "col-start-2 row-start-1 flex items-start gap-4 md:row-start-1 " +
                    (sag
                      ? "md:col-start-3"
                      : "md:col-start-1 md:flex-row-reverse md:text-right")
                  }
                >
                  <PikselIkon ad={a.ikon} className="h-10 w-10 shrink-0 text-foreground" />
                  <div>
                    <p className="font-mono text-[11px] tabular-nums tracking-[0.14em] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold leading-tight">{a.baslik}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{a.satir}</p>
                  </div>
                </div>
                <div className="col-start-1 row-start-1 pt-6 md:col-start-2">
                  <Dugum ilerleme={ilerleme} esik={esik} reduce={reduce} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
