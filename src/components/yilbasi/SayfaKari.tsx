"use client";

import { useSyncExternalStore } from "react";
import { yilbasiAktif } from "@/lib/yilbasi";
import { PikselKar } from "./PikselKar";

// ==========================================
// SAYFA GENELİ KAR + KAPATMA DÜĞMESİ
//
// Yılbaşı döneminde bütün mağaza sayfalarına hafif piksel kar
// yağar. Sağ alttaki piksel kar tanesi düğmesi karı durdurur ya
// da yeniden başlatır; tercih bu tarayıcıda hatırlanır
// (localStorage — okunamazsa kar açık başlar).
// Hareket azaltma açıksa kar hiç yağmaz, düğme de görünmez.
// ==========================================

const ANAHTAR = "adjy-kar";
const OLAY = "adjy-kar-degisti";

function oku(): boolean {
  try {
    return window.localStorage.getItem(ANAHTAR) !== "kapali";
  } catch {
    return true;
  }
}

function abone(cb: () => void) {
  window.addEventListener(OLAY, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(OLAY, cb);
    window.removeEventListener("storage", cb);
  };
}

const bos = () => () => {};
const hareketAzAbone = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

// K: kar tanesi pikselleri
const TANE = [
  "..K..",
  "K.K.K",
  ".KKK.",
  "K.K.K",
  "..K..",
];

export function SayfaKari() {
  const aktif = useSyncExternalStore(bos, () => yilbasiAktif(), () => false);
  const acik = useSyncExternalStore(abone, oku, () => true);
  const hareketAz = useSyncExternalStore(
    hareketAzAbone,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true
  );

  if (!aktif || hareketAz) return null;

  const degistir = () => {
    try {
      window.localStorage.setItem(ANAHTAR, acik ? "kapali" : "acik");
    } catch {
      // depolama kapalıysa yalnızca bu sayfada değişir
    }
    window.dispatchEvent(new Event(OLAY));
  };

  return (
    <>
      {acik && <PikselKar sabit />}
      <button
        type="button"
        onClick={degistir}
        aria-pressed={acik}
        aria-label={acik ? "Kar yağışını durdur" : "Kar yağsın"}
        title={acik ? "Kar yağışını durdur" : "Kar yağsın"}
        className="adjy-pixel-card fixed bottom-4 right-4 z-[56] grid h-10 w-10 place-items-center text-[var(--yilbasi)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 active:translate-y-0 dark:text-[var(--kar)]"
      >
        <svg viewBox="0 0 5 5" shapeRendering="crispEdges" className="h-5 w-5" aria-hidden>
          {TANE.flatMap((satir, y) =>
            [...satir].map((c, x) =>
              c === "K" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null
            )
          )}
          {!acik && <rect x={0} y={4} width={5} height={1} fill="currentColor" transform="rotate(-45 2.5 2.5)" />}
        </svg>
      </button>
    </>
  );
}
