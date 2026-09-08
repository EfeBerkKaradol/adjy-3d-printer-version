// ==========================================
// DELİKLİ DUVAR PANELİ — ÜRÜN SİSTEMİ
//
// Panel tek bir yüzey değil, bir sistem: taşıyıcı levha,
// levhadaki yuvalar, yuvaya giren J-kanca bağlantısı ve
// bu bağlantıyla asılan modüller.
//
// Buradaki ölçüler ürünün kendi fotoğrafından okundu:
// hafifçe dikey dikdörtgen levha, yuvarlatılmış köşeler,
// ince kesit, kaydırmalı sıralar hâlinde dikey yuvalar ve
// fotoğraftaki altı modülün yerleşimi.
//
// Sahne birimi: panel yüksekliği 3.0 birim.
// ==========================================

export const PANEL = {
  width: 2.7,
  height: 3.0,
  thickness: 0.07,
  cornerRadius: 0.13,
  /** Yuvasız kenar payı */
  margin: 0.26,
} as const;

/** Levhadaki dikey yuva — J-kancanın girdiği delik */
export const SLOT = {
  width: 0.062,
  height: 0.17,
  /** Sütun aralığı */
  pitchX: 0.2,
  /** Sıra aralığı */
  pitchY: 0.26,
} as const;

export type ModuleKind = "shelf" | "cup" | "bin" | "tray" | "phone" | "hook";

export interface PanelModule {
  id: string;
  label: string;
  kind: ModuleKind;
  /** Panel merkezine göre konum (sahne birimi) */
  x: number;
  y: number;
  /** Dış ölçüler */
  w: number;
  h: number;
  d: number;
  /** Bu modülü taşıyan J-kanca sayısı */
  hooks: number;
  /**
   * Patlatma yönü. Parçalar rastgele savrulmaz; her biri
   * kendi montaj ekseni boyunca panelden dışarı açılır.
   * Baskın eksen Z: parça öne doğru ayrılır, yana ise
   * yalnızca komşusunu kapatmayacak kadar kayar. Böylece
   * ayrık hâlde de bütün sistem tek kadrajda kalır.
   */
  explode: [number, number, number];
  /** Sıralı montajda kaçıncı sırada takılır */
  order: number;
}

/**
 * Fotoğraftaki dizilim. Konumlar panel merkezine göre,
 * modüller kendi asılma noktalarından ölçülür.
 */
export const MODULES: PanelModule[] = [
  {
    id: "shelf",
    label: "Raf",
    kind: "shelf",
    x: -0.6,
    y: 0.95,
    w: 1.32,
    h: 0.3,
    d: 0.42,
    hooks: 2,
    explode: [-0.63, 0.30, 1.33],
    order: 3,
  },
  {
    id: "phone",
    label: "Telefon tutucu",
    kind: "phone",
    x: 0.74,
    y: 0.84,
    w: 0.56,
    h: 0.58,
    d: 0.34,
    hooks: 2,
    explode: [0.65, 0.28, 1.21],
    order: 4,
  },
  {
    id: "cup",
    label: "Kalemlik",
    kind: "cup",
    x: -0.85,
    y: 0.12,
    w: 0.54,
    h: 0.62,
    d: 0.4,
    hooks: 1,
    explode: [-0.78, 0.02, 1.05],
    order: 2,
  },
  {
    id: "tray",
    label: "Ara raf",
    kind: "tray",
    x: 0.6,
    y: -0.02,
    w: 1.04,
    h: 0.26,
    d: 0.36,
    hooks: 2,
    explode: [0.71, -0.02, 1.09],
    order: 5,
  },
  {
    id: "bin",
    label: "Kutu",
    kind: "bin",
    x: -0.58,
    y: -0.88,
    w: 1.14,
    h: 0.72,
    d: 0.48,
    hooks: 2,
    explode: [-0.61, -0.32, 1.36],
    order: 1,
  },
  {
    id: "hookA",
    label: "Kanca",
    kind: "hook",
    x: 0.4,
    y: -0.94,
    w: 0.12,
    h: 0.26,
    d: 0.26,
    hooks: 1,
    explode: [0.46, -0.30, 0.98],
    order: 6,
  },
  {
    id: "hookB",
    label: "Kanca",
    kind: "hook",
    x: 0.76,
    y: -0.94,
    w: 0.12,
    h: 0.26,
    d: 0.26,
    hooks: 1,
    explode: [0.63, -0.34, 0.90],
    order: 7,
  },
];

/**
 * Bir modülün J-kancalarının panel üzerindeki konumları.
 * Kancalar modülün üst kenarına, yuva ızgarasına oturacak
 * şekilde yerleşir.
 */
export function hookAnchors(mod: PanelModule): Array<[number, number]> {
  const topY = mod.y + mod.h / 2;
  if (mod.hooks === 1) return [[mod.x, topY]];
  const spread = Math.min(mod.w * 0.34, SLOT.pitchX * 2);
  return [
    [mod.x - spread, topY],
    [mod.x + spread, topY],
  ];
}

/** Levhadaki yuva merkezleri — kaydırmalı sıralar */
export function slotGrid(): Array<[number, number]> {
  const innerW = PANEL.width - PANEL.margin * 2;
  const innerH = PANEL.height - PANEL.margin * 2;
  const cols = Math.floor(innerW / SLOT.pitchX);
  const rows = Math.floor(innerH / SLOT.pitchY);
  const out: Array<[number, number]> = [];

  for (let r = 0; r < rows; r += 1) {
    // Tek sıralar yarım adım kayar — gerçek delikli panel dizilimi
    const offset = r % 2 === 1 ? SLOT.pitchX / 2 : 0;
    const usable = r % 2 === 1 ? cols - 1 : cols;
    for (let c = 0; c < usable; c += 1) {
      const x = -((usable - 1) * SLOT.pitchX) / 2 + c * SLOT.pitchX + offset * 0;
      const y = -((rows - 1) * SLOT.pitchY) / 2 + r * SLOT.pitchY;
      out.push([x + offset, y]);
    }
  }
  return out;
}

/**
 * Ürün mat beyaz. Beyaz modül, beyaz levha ve açık zemin
 * üst üste gelince hacim okunmuyor; bu yüzden üç yüzey
 * birbirinden yarım ton ayrıldı — renk değişmiyor, sadece
 * derinlik okunur hâle geliyor.
 */
export const MATERIAL = {
  /** Modüller — en öndeki ve en parlak yüzey */
  body: "#FCFBF8",
  /** Taşıyıcı levha — yarım ton geride */
  panel: "#E2DFD6",
  bodyShade: "#DAD7CF",
  /** Bağlantı donanımı — okunsun diye belirgin şekilde koyu */
  hardware: "#A8A296",
} as const;
