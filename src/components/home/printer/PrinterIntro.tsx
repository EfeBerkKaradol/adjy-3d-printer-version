"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { PixelPrinter, type PrinterTick } from "./PixelPrinter";
import type { PrintItem } from "./catalog";

// ==========================================
// İLK KARŞILAMA — ATÖLYE
//
// Sağ altta piksel bir 3D yazıcı mağazadaki bütün ürünleri rastgele
// sırayla basıyor, hemen altında küçük bir durum satırı (ürün,
// yüzde) var; sol altta kısa başlık daktilo gibi yazılıyor. Aşağı
// kaydırınca yazıcı yerinde kalır, yalnızca yazılar yukarı süzülür.
//
// Erişilebilirlik:
//   - Başlığın tamamı ekran okuyucuya baştan verilir; daktilo
//     efekti yalnızca görseldir (aria-hidden).
//   - Yazılmamış harfler saydam olarak yerini tutar; yazılırken
//     satırlar kaymaz.
//   - Hareket azaltma açıksa yazılar hazır gelir, yazıcı tek bir
//     bitmiş kare gösterir, kaydırma efekti uygulanmaz.
// ==========================================

const BASLIK = ["Her ürün,", "katman katman", "sizin için basılıyor."];
const BASLIK_TOPLAM = BASLIK.reduce((t, l) => t + l.length, 0);
/** Her satırın başladığı harf sırası */
const BASLIK_BASI = BASLIK.map((_, i) => BASLIK.slice(0, i).reduce((t, l) => t + l.length, 0));

/**
 * Hareket azaltma tercihi. Sunucuda ve hidrasyon sırasında "false"
 * döner, ardından gerçek değere geçer; böylece sunucu HTML'i ile
 * ilk istemci render'ı birebir aynı kalır.
 */
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

/** Satırları sırayla, harf harf açar; açılan toplam harf sayısını döner */
function useTyped(lines: string[], opts: { enabled: boolean; delay?: number; speed?: number }) {
  const total = lines.reduce((t, l) => t + l.length, 0);
  const { enabled, delay = 250, speed = 45 } = opts;
  const [state, setState] = useState({ lines, count: 0 });
  // Metin değişince (yeni ürün) sayaç render sırasında sıfırlanır
  if (state.lines !== lines) setState({ lines, count: 0 });

  useEffect(() => {
    if (!enabled) return;
    let n = 0;
    let iv: ReturnType<typeof setInterval> | undefined;
    const to = setTimeout(() => {
      iv = setInterval(() => {
        n += 1;
        setState((s) => ({ ...s, count: n }));
        if (n >= total && iv) clearInterval(iv);
      }, speed);
    }, delay);
    return () => {
      clearTimeout(to);
      if (iv) clearInterval(iv);
    };
  }, [enabled, total, delay, speed, lines]);

  if (!enabled) return total;
  return state.lines === lines ? Math.min(state.count, total) : 0;
}

/** Yazılan + henüz yazılmamış (saydam, yer tutan) kısım */
function TypedLine({ text, shown }: { text: string; shown: number }) {
  return (
    <>
      {text.slice(0, shown)}
      <span className="opacity-0">{text.slice(shown)}</span>
    </>
  );
}

/** Durum satırındaki piksel çubuğun blok sayısı */
const BLOK = 12;

interface Props {
  items: PrintItem[];
}

export function PrinterIntro({ items }: Props) {
  const reduce = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(0);

  const keys = useMemo(() => items.map((i) => i.key), [items]);
  const item = items[current] ?? items[0];

  // ---- başlık daktilosu ----
  const typed = useTyped(BASLIK, { enabled: !reduce, delay: 350, speed: 48 });
  const baslikBitti = typed >= BASLIK_TOPLAM;
  const satirlar = BASLIK.map((l, i) => Math.max(0, Math.min(l.length, typed - BASLIK_BASI[i])));

  // ---- baskıdaki ürün adı: her yeni nesnede yeniden yazılır ----
  const adSatiri = useMemo(() => [item?.name ?? ""], [item?.name]);
  const adYazilan = useTyped(adSatiri, { enabled: !reduce && baslikBitti, delay: 80, speed: 28 });

  const onTick = useCallback((t: PrinterTick) => {
    // Piksel çubuk: yüzdeye göre dolu blok sayısı, doğrudan DOM'a yazılır
    const bar = barRef.current;
    if (bar) {
      const dolu = t.phase === "heat" ? 0 : Math.floor((t.percent / 100) * BLOK);
      Array.from(bar.children).forEach((c, i) => {
        (c as HTMLElement).dataset.on = i < dolu ? "1" : "0";
      });
    }
    const el = pctRef.current;
    if (!el) return;
    el.textContent =
      t.phase === "heat"
        ? "ısınıyor…"
        : t.phase === "print"
          ? `%${t.percent}`
          : t.phase === "done"
            ? "hazır ✓"
            : "sıradaki…";
  }, []);

  // ---- kaydırma: yazıcı yerinde durur, yalnızca yazılar yukarı süzülür ----
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="atolye-baslik"
      className="relative overflow-hidden"
    >
      <div className="adjy-container relative grid gap-8 pb-16 pt-6 sm:pt-8 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end lg:gap-10 lg:pb-20 lg:pt-6">
        {/* ---------- sol alt: kısa yazı ---------- */}
        <motion.div
          style={reduce ? undefined : { y: textY, opacity: textOpacity }}
          className="relative z-10 max-w-md lg:self-end lg:pb-4"
        >
          <h1
            id="atolye-baslik"
            className="adjy-display text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.02]"
          >
            <span className="sr-only">{BASLIK.join(" ")}</span>
            <span aria-hidden>
              {BASLIK.map((l, i) => (
                <span
                  key={l}
                  className={i === BASLIK.length - 1 ? "block text-muted-foreground" : "block"}
                >
                  <TypedLine text={l} shown={satirlar[i]} />
                </span>
              ))}
            </span>
          </h1>

          <Link
            href="/products"
            className="group mt-5 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
          >
            Ürünleri keşfet
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </motion.div>

        {/* ---------- sağ alt: yazıcı ve altında küçük durum satırı ---------- */}
        <div className="relative flex flex-col items-center justify-self-end lg:self-end">
          {/* Arka plandaki piksel ızgara */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-10 opacity-[0.13] [background-image:radial-gradient(var(--foreground)_1px,transparent_1.5px)] [background-size:12px_12px] [mask-image:radial-gradient(closest-side,black,transparent)]"
          />
          <PixelPrinter
            keys={keys}
            reduceMotion={reduce}
            onObject={setCurrent}
            onTick={onTick}
            className="relative block h-auto w-[312px] md:w-[416px] xl:w-[520px]"
          />

          {/* Yazıcıda şu an ne var — küçük, yazıcının hemen altında */}
          {item && (
            <div className="adjy-pixel-box relative mt-3 inline-flex max-w-full items-center gap-2.5 whitespace-nowrap bg-background px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.06em]">
              <Link
                href={item.href}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                <span className="sr-only">Şu an baskıda: {item.name}</span>
                <span aria-hidden>
                  <TypedLine text={item.name} shown={adYazilan} />
                </span>
              </Link>
              {/* Piksel ilerleme çubuğu */}
              <span ref={barRef} className="flex gap-px" aria-hidden>
                {Array.from({ length: BLOK }, (_, i) => (
                  <span
                    key={i}
                    data-on={reduce ? "1" : "0"}
                    className="block h-2 w-1.5 bg-foreground/15 data-[on=1]:bg-foreground"
                  />
                ))}
              </span>
              <span
                ref={pctRef}
                className="min-w-[5.5em] tabular-nums text-muted-foreground"
                aria-hidden
              >
                ısınıyor…
              </span>
              {item.price && (
                <span className="hidden tabular-nums text-muted-foreground sm:inline">
                  · {item.price}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Aşağı kaydır ipucu */}
      <motion.a
        href="#vitrin"
        style={reduce ? undefined : { opacity: hintOpacity }}
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground lg:flex"
      >
        Kaydır
        <ChevronDown className="h-4 w-4 motion-safe:animate-bounce" aria-hidden />
      </motion.a>
    </section>
  );
}
