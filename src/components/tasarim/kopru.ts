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
  /**
   * Üretim projesi (atölye, renkli.js): parça STL'lerinden, renge göre
   * ayrı tablalara dizilmiş ve adet kadar çoğaltılmış dilimleyici projesi
   */
  uretimProjesi?: (
    kaynak: (AracDosyasi & { nesne?: string; tekRenk?: boolean })[],
    secenek: { adet: number; duzen?: TablaDuzeni }
  ) => Promise<UretimSonucu>;
  /** Modelin basılacak renkleri (atölye, renkli.js) */
  renkListesi?: () => AracRengi[];
  dosyalariYukle: () => Promise<Record<string, unknown>>;
  dosyaVar: (girisId: string) => boolean;
  dosyaSayisi: () => number;
  hazirMi: () => boolean;
}

export interface AracMesaji {
  kaynak: "adjy-arac";
  tur: "durum" | "hazir" | "rehber";
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

/** Modelin basılacak renkleri: sıra = dilimleyicideki filament yuvası */
export interface AracRengi {
  no: number;
  hex: string;
  ad: string;
}

/**
 * Üretim projesinin tabla düzeni.
 *   oto  → tek tablaya sığıyor ve filament değişimi makul kalıyorsa tek tabla
 *          (farklı renkte parçalar nesne nesne basılır); değilse renge göre ayrı
 *   tek  → sığıyorsa her durumda tek tabla
 *   ayri → tek renkli parçalar her durumda rengine göre ayrı tablada
 */
export type TablaDuzeni = "oto" | "tek" | "ayri";

/** Üretim projesinin bir tablası: hangi renk(ler), hangi parçadan kaç tane */
export interface UretimTablasi {
  no: number;
  renkler: AracRengi[];
  parcalar: { ad: string; adet: number }[];
  /** Parça tablaya sığmıyor: elle bölünmeli ya da büyük makinede basılmalı */
  tasiyor: boolean;
  /** Tahmini filament değişimi (0: tabla tek renk) */
  degisim: number;
  /** Tabla nesne nesne basılır: filament yalnız parçalar arasında değişir */
  nesneNesne: boolean;
}

export interface UretimSonucu {
  dosyalar: AracDosyasi[];
  ozet: UretimTablasi[];
  renkler: AracRengi[];
  /** Rengi sahneden okunamayan parça sayısı */
  eslesmeyen: number;
  /** Parçalar tek tablaya sığdığı hâlde ayrıldıysa: tek tablada kaç değişim olurdu */
  tekTablaDegisimi: number | null;
}

/**
 * Atölye kipinde aracın renkli baskı modülü (renkli.js → ADJY_RENKLI)
 * modeli renge göre ayırır; 3MF'teki filament sırası budur.
 */
export function aracRenkleri(cerceve: HTMLIFrameElement | null): AracRengi[] {
  try {
    const pencere = cerceve?.contentWindow as
      | (Window & { ADJY_RENKLI?: { renkler: () => AracRengi[] } })
      | null;
    return pencere?.ADJY_RENKLI?.renkler() ?? [];
  } catch {
    return [];
  }
}

export function aracMesajiMi(veri: unknown, aracId: string): veri is AracMesaji {
  if (!veri || typeof veri !== "object") return false;
  const m = veri as Partial<AracMesaji>;
  return m.kaynak === "adjy-arac" && m.arac === aracId;
}
