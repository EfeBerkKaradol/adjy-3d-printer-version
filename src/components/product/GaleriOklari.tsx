"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ==========================================
// GALERİ OKLARI
//
// Büyük görselin iki yanında önceki / sonraki düğmesi. Küçük
// görsel şeridi duruyor ama ona inmeden görseller arasında
// gezilebilsin: oklar, klavyede sol/sağ ok tuşu, dokunmatik
// ekranda kaydırma. Son görselden sonra başa döner.
//
// Görselin üstüne serilen katman olarak kullanılır; kapsayıcı
// "relative" ve "group" olmalı.
// ==========================================

interface Props {
  /** Gezilen görsel sayısı (bozuk olanlar hariç) */
  adet: number;
  onceki: () => void;
  sonraki: () => void;
  ad: string;
}

export function GaleriOklari({ adet, onceki, sonraki, ad }: Props) {
  const dokunus = useRef<number | null>(null);
  if (adet < 2) return null;

  const dugme =
    "pointer-events-auto flex h-11 w-11 items-center justify-center border-2 border-foreground bg-background/90 text-foreground shadow-[3px_3px_0_0_var(--foreground)] backdrop-blur-sm transition-[transform,opacity,box-shadow] hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 sm:opacity-80 sm:group-hover:opacity-100";

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-between px-3 outline-none"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onceki();
        if (e.key === "ArrowRight") sonraki();
      }}
      onTouchStart={(e) => {
        dokunus.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const bas = dokunus.current;
        dokunus.current = null;
        const son = e.changedTouches[0]?.clientX;
        if (bas == null || son == null) return;
        const fark = son - bas;
        if (Math.abs(fark) < 40) return;
        if (fark > 0) onceki();
        else sonraki();
      }}
    >
      <button
        type="button"
        onClick={onceki}
        aria-label={`${ad}: önceki görsel`}
        className={cn(dugme)}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={sonraki}
        aria-label={`${ad}: sonraki görsel`}
        className={cn(dugme)}
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

/** Bozuk görselleri atlayarak bir sonraki / önceki sıra */
export function galeriAdimi(
  sira: number,
  yon: 1 | -1,
  toplam: number,
  bozuk: Record<number, boolean>
): number {
  for (let k = 1; k <= toplam; k++) {
    const i = (((sira + yon * k) % toplam) + toplam) % toplam;
    if (!bozuk[i]) return i;
  }
  return sira;
}
