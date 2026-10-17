// ==========================================
// MÜŞTERİ SEGMENTLERİ
//
// CRM'in işe yaraması için listenin "kim bunlar?" sorusuna
// cevap vermesi gerekiyor. Segmentler elle atanmaz, veriden
// çıkar: kaç sipariş vermiş, ne kadar harcamış, en son ne zaman
// görünmüş.
//
// Eşikler tek yerde durur ki rapor, liste ve müşteri kartı
// aynı şeyi söylesin.
// ==========================================

/** Bu tutarın üstünde harcayan müşteri VIP sayılır (TL) */
export const VIP_ESIGI = 2000;

/** Son siparişten bu kadar gün geçtiyse müşteri uykuda sayılır */
export const UYKU_GUNU = 90;

export type SegmentId = "vip" | "tekrar" | "ilk" | "uykuda" | "yeni";

export interface Segment {
  id: SegmentId;
  label: string;
  /** Rozet rengi — Tailwind sınıfı */
  className: string;
  description: string;
}

export const SEGMENTLER: Record<SegmentId, Segment> = {
  vip: {
    id: "vip",
    label: "VIP",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    description: `Toplam ${VIP_ESIGI.toLocaleString("tr-TR")} TL üstü harcama`,
  },
  tekrar: {
    id: "tekrar",
    label: "Tekrar eden",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    description: "Birden fazla sipariş verdi",
  },
  ilk: {
    id: "ilk",
    label: "İlk siparişi",
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
    description: "Tek siparişi var",
  },
  uykuda: {
    id: "uykuda",
    label: "Uykuda",
    className: "bg-muted text-muted-foreground",
    description: `Son siparişinden ${UYKU_GUNU} günden fazla geçti`,
  },
  yeni: {
    id: "yeni",
    label: "Henüz almadı",
    className: "bg-muted text-muted-foreground",
    description: "Kayıtlı ama siparişi yok",
  },
};

export interface MusteriOlculeri {
  siparisSayisi: number;
  toplamHarcama: number;
  sonSiparis: Date | null;
}

/**
 * Müşterinin segmentini belirler.
 *
 * Sıra önemli: uykuda olmak harcama tutarından önce gelmez —
 * çok harcamış ama aylardır uğramamış biri hâlâ VIP'tir, ona
 * göre aranır. Uyku ayrı bir işaret olarak da döner.
 */
export function segmentBelirle(o: MusteriOlculeri): Segment {
  if (o.siparisSayisi === 0) return SEGMENTLER.yeni;
  if (o.toplamHarcama >= VIP_ESIGI) return SEGMENTLER.vip;
  if (o.siparisSayisi > 1) return SEGMENTLER.tekrar;
  return SEGMENTLER.ilk;
}

/** Son siparişten bu yana geçen gün — hiç siparişi yoksa null */
export function uykuGunu(sonSiparis: Date | null): number | null {
  if (!sonSiparis) return null;
  return Math.floor((Date.now() - sonSiparis.getTime()) / 86_400_000);
}

export function uykudaMi(sonSiparis: Date | null): boolean {
  const g = uykuGunu(sonSiparis);
  return g !== null && g > UYKU_GUNU;
}
