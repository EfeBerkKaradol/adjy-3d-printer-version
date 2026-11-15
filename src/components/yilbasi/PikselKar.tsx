"use client";

import { useEffect, useRef } from "react";
import { yilbasiAktif } from "@/lib/yilbasi";

// ==========================================
// PİKSEL KAR
//
// Karşılamadaki piksel yazıcının dünyasına yağan kar: tanecikler
// sitenin piksel diliyle aynı, 2 piksellik ızgaraya oturan kareler.
// İçeriğin ARKASINDA durur (z-0), yazının üstüne düşmez.
//
// - Hareket azaltma açıksa hiç çizilmez.
// - Bölüm ekrandan çıkınca ya da sekme gizlenince durur.
// - Renk --kar'dan gelir: açık zeminde soğuk gri-mavi, koyu
//   temada beyaz.
// - Dönem dışında (lib/yilbasi.ts) hiçbir şey çizmez.
// ==========================================

interface Tane {
  x: number;
  y: number;
  boy: number;
  hiz: number;
  salinim: number;
  faz: number;
  saydam: number;
}

const IZGARA = 2;

interface Props {
  /**
   * Sayfa geneli: ekrana sabitlenir, içeriğin ÜSTÜNDEN ama
   * tıklamaları engellemeden yağar; tanecikler daha seyrek ve küçük
   * ki okumayı bozmasın. Varsayılan: bulunduğu bölümün arkasında.
   */
  sabit?: boolean;
}

export function PikselKar({ sabit = false }: Props) {
  const tuval = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = tuval.current;
    if (!cv || !yilbasiAktif()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let taneler: Tane[] = [];
    let renk = "#8FA6BA";
    let kare = 0;
    let gorunur = true;
    let onceki = performance.now();

    const yeniTane = (ustten: boolean): Tane => ({
      x: Math.random() * w,
      y: ustten ? -8 - Math.random() * 40 : Math.random() * h,
      boy: sabit
        ? [2, 2, 4, 4, 4][Math.floor(Math.random() * 5)]
        : [2, 4, 4, 4, 6, 6][Math.floor(Math.random() * 6)],
      hiz: 14 + Math.random() * 26,
      salinim: 6 + Math.random() * 14,
      faz: Math.random() * Math.PI * 2,
      saydam: 0.45 + Math.random() * 0.5,
    });

    const boyutla = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Yoğunluk alana göre: telefonda da, geniş ekranda da aynı his
      const hedef = sabit
        ? Math.round(Math.min(120, Math.max(30, (w * h) / 13000)))
        : Math.round(Math.min(220, Math.max(48, (w * h) / 6500)));
      taneler = Array.from({ length: hedef }, () => yeniTane(false));
      renk = getComputedStyle(cv).getPropertyValue("--kar").trim() || renk;
    };

    const ciz = (simdi: number) => {
      const dt = Math.min(0.05, (simdi - onceki) / 1000);
      onceki = simdi;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = renk;
      for (const t of taneler) {
        t.y += t.hiz * dt;
        t.faz += dt * 0.9;
        if (t.y > h + 8) Object.assign(t, yeniTane(true));
        const x = Math.round((t.x + Math.sin(t.faz) * t.salinim) / IZGARA) * IZGARA;
        const y = Math.round(t.y / IZGARA) * IZGARA;
        ctx.globalAlpha = t.saydam;
        ctx.fillRect(x, y, t.boy, t.boy);
      }
      ctx.globalAlpha = 1;
      kare = requestAnimationFrame(ciz);
    };

    const baslat = () => {
      if (kare || !gorunur || document.hidden) return;
      onceki = performance.now();
      kare = requestAnimationFrame(ciz);
    };
    const durdur = () => {
      if (kare) cancelAnimationFrame(kare);
      kare = 0;
    };

    boyutla();
    const ro = new ResizeObserver(boyutla);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      gorunur = e.isIntersecting;
      if (gorunur) baslat();
      else durdur();
    });
    io.observe(cv);
    const sekme = () => (document.hidden ? durdur() : baslat());
    document.addEventListener("visibilitychange", sekme);
    // Tema değişince (açık/koyu) kar rengi yeniden okunur
    const tema = new MutationObserver(() => {
      renk = getComputedStyle(cv).getPropertyValue("--kar").trim() || renk;
    });
    tema.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    baslat();

    return () => {
      durdur();
      ctx.clearRect(0, 0, w, h);
      ro.disconnect();
      io.disconnect();
      tema.disconnect();
      document.removeEventListener("visibilitychange", sekme);
    };
  }, [sabit]);

  return (
    <canvas
      ref={tuval}
      aria-hidden
      className={
        sabit
          ? "pointer-events-none fixed inset-0 z-[55] h-screen w-screen"
          : "pointer-events-none absolute inset-0 z-0 h-full w-full"
      }
    />
  );
}
