"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { progressToTimeFraction } from "./objectStoryTimeline";

// ==========================================
// SCROLL İLE SÜRÜLEN VİDEO
//
// Video kendiliğinden oynamaz. Tek işi var: gösterdiği kare
// her an kullanıcının kaydırma konumuna karşılık gelsin.
//
// Neden requestAnimationFrame:
// Scroll olayı saniyede yüzlerce kez gelebilir; her birinde
// currentTime yazmak arama (seek) kuyruğunu tıkar ve görüntü
// takılır. Bunun yerine son hedef bir ref'te tutulur, karede
// bir kez yazılır. Bu bir yumuşatma değil — araya easing
// girmiyor, yalnızca yazma sıklığı ekranın hızına eşitleniyor.
// Kullanıcı hızlı kaydırdığında video hedef kareye atlar,
// geriye kaydırdığında animasyon geri sarar.
//
// Dosya yalnızca bölüm yaklaşınca indirilir; ana sayfa
// açılışında ağ trafiği yaratmaz.
// ==========================================

interface ScrollScrubVideoProps {
  src: string;
  progress: MotionValue<number>;
  /** Video çözülene kadar altta duran gerçek ürün görseli */
  poster?: string;
  className?: string;
  onReadyChange?: (ready: boolean) => void;
}

/** Bir kareden küçük farklar için arama yapma — boşuna seek olur */
const FRAME = 1 / 30;

export function ScrollScrubVideo({
  src,
  progress,
  poster,
  className,
  onReadyChange,
}: ScrollScrubVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const targetFraction = useRef(0);
  const rafId = useRef<number | null>(null);
  const idleFrames = useRef(0);

  // IntersectionObserver'ı olmayan bir tarayıcıda gözlem kurulamaz;
  // orada dosya doğrudan yüklenir. Sunucuda her zaman false —
  // işaretlemede src bulunmaz, ana sayfa açılışı hafif kalır.
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof window !== "undefined" && typeof IntersectionObserver === "undefined"
  );
  const [ready, setReady] = useState(false);

  // ---- Yaklaşınca indir --------------------------------------------
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      // Bir ekran boyu önceden başlat: bölüme varıldığında
      // ilk kare çoktan hazır olsun.
      { rootMargin: "100% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---- Kaydırmayı kareye çevir --------------------------------------
  useEffect(() => {
    if (!ready) return;

    const video = videoRef.current;
    if (!video) return;

    const step = () => {
      rafId.current = null;

      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      const wanted = targetFraction.current * duration;
      const delta = Math.abs(video.currentTime - wanted);

      if (delta > FRAME) {
        idleFrames.current = 0;
        // Devam eden bir arama varsa üstüne yazma; hedef ref'te
        // duruyor, bir sonraki karede zaten yakalanacak.
        if (!video.seeking) video.currentTime = wanted;
      } else {
        idleFrames.current += 1;
      }

      // Kullanıcı durduysa döngüyü bırak; scroll gelince yeniden başlar
      if (idleFrames.current < 4) {
        rafId.current = requestAnimationFrame(step);
      }
    };

    const kick = () => {
      idleFrames.current = 0;
      if (rafId.current === null) rafId.current = requestAnimationFrame(step);
    };

    // İlk kareyi hemen doğru yere getir
    kick();

    const unsubscribe = progress.on("change", kick);
    return () => {
      unsubscribe();
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
  }, [ready, progress]);

  // Hedef, video hazır olmasa da güncel tutulur: hazır olduğu
  // anda doğru kareye oturur, baştan başlamaz.
  useMotionValueEvent(progress, "change", (value) => {
    targetFraction.current = progressToTimeFraction(value);
  });

  return (
    <div ref={wrapRef} className={className}>
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        poster={poster}
        preload={shouldLoad ? "auto" : "none"}
        muted
        playsInline
        // Oynatılmayan bir görsel: klavye ve ekran okuyucu için
        // bir şey ifade etmiyor, metin perdeleri hikâyeyi anlatıyor.
        aria-hidden
        tabIndex={-1}
        disablePictureInPicture
        className={`h-full w-full object-cover transition-opacity duration-500 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        onLoadedData={() => {
          setReady(true);
          onReadyChange?.(true);
        }}
        onError={() => {
          setReady(false);
          onReadyChange?.(false);
        }}
      />
    </div>
  );
}
