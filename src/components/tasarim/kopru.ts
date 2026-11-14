// ==========================================
// ARAÇ KÖPRÜSÜ — MAĞAZA TARAFI
//
// Tasarım aracı bir çerçevenin içinde çalışıyor. Çerçeve
// mağazayla aynı kökenden sunulduğu için içindeki köprüye
// (public/tasarim-araclari/_adjy/kopru.js → window.ADJY)
// doğrudan erişilebiliyor; değişiklikler ise postMessage ile
// gelir, çünkü aracın ne zaman hazır olacağı belli değil.
// ==========================================

import type { TasarimSecimi } from "@/lib/tasarim/order";

/** Köprünün bildirdiği seçim: ayrıntı ayarları işaretli gelir */
export interface AracSecimi extends TasarimSecimi {
  /** Sade görünümde kapalı duran ayar — kısa özete girmez */
  ayrinti?: boolean;
}

/** Araçtan gelen (ya da indirilen) tek dosya */
export interface AracDosyasi {
  ad: string;
  blob: Blob;
}

/** Aracın her değişiklikte gönderdiği paket */
export interface AracPaketi {
  durum: Record<string, unknown>;
  ozet: AracSecimi[];
  olcum: { kutleG?: number; sureSaat?: number };
}

/** Çerçevenin içindeki window.ADJY */
export interface AracArayuzu {
  uretim: boolean;
  paket: () => AracPaketi;
  yukle: (durum: Record<string, unknown>) => Promise<boolean>;
  gorsel: (genislik?: number) => string | null;
  tema: (tema: "acik" | "koyu") => void;
  tikla: (secici: string) => boolean;
  /** Çıktı düğmelerine basar, dosyaları indirmek yerine döndürür (atölye) */
  topla: (seciciler: string[], secenek?: { sessizlik?: number }) => Promise<AracDosyasi[]>;
  /** Sade görünüm ile bütün ayarlar arasında geçiş */
  ayar: (kip: "sade" | "tum") => void;
  gelismisVar: boolean;
  dosyalariYukle: () => Promise<Record<string, unknown>>;
  dosyaVar: (girisId: string) => boolean;
  dosyaSayisi: () => number;
  hazirMi: () => boolean;
}

export interface AracMesaji {
  kaynak: "adjy-arac";
  tur: "durum" | "hazir";
  arac: string;
  veri?: AracPaketi;
}

/** Çerçevenin köprüsü — henüz yüklenmediyse null */
export function aracArayuzu(cerceve: HTMLIFrameElement | null): AracArayuzu | null {
  try {
    const pencere = cerceve?.contentWindow as (Window & { ADJY?: AracArayuzu }) | null;
    return pencere?.ADJY ?? null;
  } catch {
    return null;
  }
}

export function aracMesajiMi(veri: unknown, aracId: string): veri is AracMesaji {
  if (!veri || typeof veri !== "object") return false;
  const m = veri as Partial<AracMesaji>;
  return m.kaynak === "adjy-arac" && m.arac === aracId;
}
