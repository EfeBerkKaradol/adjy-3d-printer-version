"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ==========================================
// KART VİDEOSU
//
// Özelleştirme animasyonu olan ürünün kartında, görselin üstüne
// serilen kısa döngü (~100 KB, 4 sn): ayarlar değiştikçe ürünün
// aldığı biçimler. Kart görseli yerinde kalır, video oynamaya
// başlayınca üstünde belirir.
//
//   otomatik → hemen oynar (ızgaranın başındaki büyük kart)
//   değilse  → kartın üzerine gelince oynar, ayrılınca durur; dosya
//              ancak o an indirilir (preload="none")
//
// Hareketi azalt tercihinde kendiliğinden oynamaz, üzerine gelince oynar.
// ==========================================

interface Props {
  adres: string;
  otomatik?: boolean;
  className?: string;
}

export function KartVideosu({ adres, otomatik = false, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [oynuyor, setOynuyor] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const oynat = () => {
      video.play().catch(() => {});
    };
    const durdur = () => {
      video.pause();
      setOynuyor(false);
    };

    // Kendiliğinden oynama hareketi azalt tercihinde kapalı; üzerine
    // gelince oynama ise kullanıcının kendi eylemi, her durumda oynar
    // (Windows'ta animasyonlar kapalıyken tarayıcı da "azalt" diyor).
    const azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (otomatik && !azalt) {
      oynat();
      return;
    }
    const kart = video.closest("a, li") ?? video.parentElement;
    if (!kart) return;
    kart.addEventListener("mouseenter", oynat);
    kart.addEventListener("mouseleave", durdur);
    kart.addEventListener("focusin", oynat);
    kart.addEventListener("focusout", durdur);
    return () => {
      kart.removeEventListener("mouseenter", oynat);
      kart.removeEventListener("mouseleave", durdur);
      kart.removeEventListener("focusin", oynat);
      kart.removeEventListener("focusout", durdur);
    };
  }, [otomatik]);

  return (
    <video
      ref={ref}
      src={adres}
      muted
      loop
      playsInline
      preload={otomatik ? "metadata" : "none"}
      aria-hidden
      tabIndex={-1}
      onPlaying={() => setOynuyor(true)}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
        oynuyor ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
}
