// ==========================================
// PİKSEL NESNELER
//
// Karşılamadaki yazıcının bastığı ürünler. Her biri kataloğumuzdaki
// gerçek bir ürünün piksel hâli; görsel dosyası yok, hepsi kodla
// çiziliyor. Dönel nesneler (vazo, saksı, lamba) bir yarıçap
// eğrisinden üretilir, kedi gibi dönel olmayanlar elle çizilir.
//
// Sprite'ın satırları ALTTAN yukarı değil, ekrandaki gibi yukarıdan
// aşağı tutulur; yazıcı yine de alttan başlayarak basar.
// ==========================================

export type Px = string | null;

export interface Extra {
  /** Sprite içindeki konum (sol üst = 0,0); sprite dışına taşabilir */
  x: number;
  y: number;
  color: string;
  /** Bitiş anından itibaren saniye cinsinden görünme gecikmesi */
  delay: number;
  /** Yanıp sönen ışık mı */
  blink?: boolean;
}

export interface Sprite {
  key: string;
  w: number;
  h: number;
  /** rows[y][x] — yukarıdan aşağı */
  rows: Px[][];
  /** Filament rengi: makaradaki ip bu renge döner */
  filament: string;
  /** Baskı bittiğinde yanan ışık (lambalar için) */
  glow?: { cx: number; cy: number; r: number; color: string };
  /** Baskıdan sonra beliren süsler: yapraklar, ağaç ışıkları */
  extras?: Extra[];
}

// ---------- renk yardımcıları ----------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** amt > 0 açar, < 0 koyulaştırır (−1…1) */
export function shade(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}

/** İki renk arasında karışım (0 = a, 1 = b) */
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// ---------- üreticiler ----------

/** Anahtar noktalar arasında yumuşak (kosinüs) geçiş */
function curve(points: [number, number][]) {
  return (f: number) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [f0, r0] = points[i];
      const [f1, r1] = points[i + 1];
      if (f >= f0 && f <= f1) {
        const t = (f - f0) / (f1 - f0 || 1);
        const k = (1 - Math.cos(t * Math.PI)) / 2;
        return r0 + (r1 - r0) * k;
      }
    }
    return points[points.length - 1][1];
  };
}

/**
 * Dönel bir gövdeyi önden çizer: soldan ışık alır, sağı gölgede.
 * radius(f) — f alttan yukarı 0…1, dönüş piksel cinsinden yarıçap.
 */
function revolve(
  h: number,
  radius: (f: number) => number,
  base: string,
  opts: { ring?: (rowFromBottom: number) => boolean; spot?: (x: number, y: number) => boolean } = {}
) {
  const maxR = Math.ceil(Math.max(...Array.from({ length: h }, (_, i) => radius(i / (h - 1)))));
  const w = maxR * 2 + 1;
  const c = maxR;
  const light = shade(base, 0.28);
  const dark = shade(base, -0.28);
  const rows: Px[][] = [];
  for (let y = 0; y < h; y++) {
    const fromBottom = h - 1 - y;
    const r = radius(fromBottom / (h - 1));
    const row: Px[] = [];
    for (let x = 0; x < w; x++) {
      const dx = x - c;
      if (Math.abs(dx) > r) {
        row.push(null);
        continue;
      }
      const t = r > 0 ? dx / r : 0;
      let col = t < -0.45 ? light : t > 0.5 ? dark : base;
      if (opts.ring?.(fromBottom)) col = shade(col, -0.14);
      if (opts.spot?.(x, y)) col = shade(col, -0.18);
      row.push(col);
    }
    rows.push(row);
  }
  return { w, h, rows };
}

/** Harf haritasından sprite: her harf bir renge karşılık gelir */
function fromMap(map: string[], palette: Record<string, string>) {
  const w = Math.max(...map.map((r) => r.length));
  const rows: Px[][] = map.map((line) =>
    Array.from({ length: w }, (_, x) => {
      const ch = line[x] ?? ".";
      return ch === "." ? null : palette[ch] ?? null;
    })
  );
  return { w, h: map.length, rows };
}

/** Boş piksele komşu dolu pikselleri koyu bir çizgiyle çevreler */
function outline(s: { w: number; h: number; rows: Px[][] }, color: string) {
  const W = s.w + 2;
  const H = s.h + 2;
  const get = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < s.w && y < s.h ? s.rows[y][x] : null;
  const rows: Px[][] = [];
  for (let y = 0; y < H; y++) {
    const row: Px[] = [];
    for (let x = 0; x < W; x++) {
      const own = get(x - 1, y - 1);
      if (own) {
        row.push(own);
        continue;
      }
      const near =
        get(x - 2, y - 1) || get(x, y - 1) || get(x - 1, y - 2) || get(x - 1, y);
      row.push(near ? color : null);
    }
    rows.push(row);
  }
  return { w: W, h: H, rows };
}

/** İki sprite'ı alt kenarları hizalı ve ortalı olarak üst üste koyar */
function stack(parts: { w: number; h: number; rows: Px[][] }[]) {
  const w = Math.max(...parts.map((p) => p.w));
  const rows: Px[][] = [];
  for (const p of parts) {
    const off = Math.floor((w - p.w) / 2);
    for (const r of p.rows) {
      const row: Px[] = Array(w).fill(null);
      r.forEach((v, i) => (row[i + off] = v));
      rows.push(row);
    }
  }
  return { w, h: rows.length, rows };
}

// ---------- nesneler ----------

function vazo(): Sprite {
  const base = "#c4693f";
  const body = revolve(
    30,
    curve([
      [0, 5],
      [0.4, 10],
      [0.74, 5.4],
      [0.88, 4],
      [1, 5.6],
    ]),
    base,
    { ring: (r) => r % 4 === 1 && r > 2 && r < 26 }
  );
  return { key: "vazo", ...outline(body, shade(base, -0.55)), filament: base };
}

function mantarLamba(): Sprite {
  const cap = "#e8a13a";
  const stem = "#efe4cc";
  const capPart = revolve(
    13,
    (f) => (f < 0.12 ? 12.4 : 12.6 * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.12) / 0.9, 2)))),
    cap,
    { spot: (x, y) => (x === 7 && y === 4) || (x === 16 && y === 6) || (x === 11 && y === 2) }
  );
  const stemPart = revolve(15, curve([[0, 4.6], [0.15, 3], [0.8, 2.4], [1, 3.4]]), stem);
  const s = outline(stack([capPart, stemPart]), "#5a3a1a");
  return {
    key: "mantar",
    ...s,
    filament: cap,
    glow: { cx: s.w / 2, cy: 7, r: 17, color: "#ffcf6b" },
  };
}

function kedi(): Sprite {
  const s = fromMap(
    [
      ".L...........L.....",
      ".LL.........LL.....",
      ".LPL.......LPL.....",
      ".LLLLLLLLLLLLL.....",
      "LLLLLLLLLLLLLLM....",
      "LLLEELLLLLEELLM....",
      "LLLEELLLLLEELLM....",
      "LLLLLLLNLLLLLLM....",
      "LLLLLLLLLLLLLMM....",
      ".LLLLLLLLLLLMM.....",
      "..LLLLLLLLLLM......",
      "..LLLLLLLLLLLM.....",
      ".LLLLLLLLLLLLLM..M.",
      ".LLLLLLLLLLLLLM..M.",
      ".LLLLLLLLLLLLMM..M.",
      ".LLLLLLLLLLLLMM..M.",
      ".LLLLLLLLLLLLMM.MM.",
      ".LLLLLLLLLLLMMMMM..",
      "LLLLLLLLLLLLMMMM...",
      "MMMMMMMMMMMMMMM....",
    ],
    { L: "#f1efe9", M: "#cbc7bc", E: "#2a2a2c", N: "#e48a8a", P: "#f0b8b8" }
  );
  return { key: "kedi", ...outline(s, "#55524a"), filament: "#f1efe9" };
}

function saksi(): Sprite {
  const pot = "#93ad8e";
  const rim = revolve(3, () => 10.4, shade(pot, 0.05));
  const body = revolve(14, curve([[0, 6.6], [1, 9.4]]), pot, {
    ring: (r) => r === 4 || r === 9,
  });
  const legs = fromMap(
    ["DD.....DD.....DD", "DD.....DD.....DD", "DD.....DD.....DD", "DD.....DD.....DD", ".D.....DD.....D."],
    { D: shade(pot, -0.32) }
  );
  const s = outline(stack([rim, body, legs]), "#2f4430");
  const lc = Math.floor(s.w / 2);
  const leaf = "#4c8a45";
  const leafHi = "#79b46a";
  // Baskıdan sonra saksıdan çıkan bitki — alttan yukarı büyür
  const yapraklar: [number, number, string][] = [
    [0, -1, leaf], [0, -2, leaf], [0, -3, leaf], [0, -4, leaf], [0, -5, leaf], [0, -6, leaf],
    [-1, -3, leaf], [-2, -4, leafHi], [-3, -4, leaf], [-3, -5, leafHi], [-4, -5, leaf],
    [1, -5, leaf], [2, -6, leafHi], [3, -6, leaf], [3, -7, leafHi], [4, -7, leaf],
    [0, -7, leaf], [-1, -8, leafHi], [-1, -9, leaf], [0, -8, leaf], [1, -9, leafHi],
    [-2, -1, leaf], [-3, -2, leafHi], [-4, -2, leaf], [2, -1, leaf], [3, -2, leafHi], [4, -2, leaf],
  ];
  return {
    key: "saksi",
    ...s,
    filament: pot,
    extras: yapraklar.map(([dx, dy, color], i) => ({
      x: lc + dx,
      y: dy,
      color,
      delay: 0.1 + (Math.abs(dy) * 0.07) + (i % 3) * 0.02,
    })),
  };
}

function ayLamba(): Sprite {
  const moon = "#efe6cc";
  const krater = new Set(["8,5", "9,5", "8,6", "15,9", "16,9", "15,10", "6,13", "11,16", "12,16", "17,15", "10,10"]);
  const sphere = revolve(
    23,
    (f) => 11.5 * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.5) / 0.52, 2))),
    moon,
    { spot: (x, y) => krater.has(`${x},${y}`) }
  );
  const stand = revolve(2, () => 1.6, "#8a8a90");
  const base = revolve(3, () => 7, "#8b6a4a", { ring: (r) => r === 2 });
  const s = outline(stack([sphere, stand, base]), "#4a4032");
  return {
    key: "ay",
    ...s,
    filament: moon,
    glow: { cx: s.w / 2, cy: 12, r: 18, color: "#fff2c4" },
  };
}

function agac(): Sprite {
  const green = "#3d8a55";
  const s = fromMap(
    [
      "...........Y...........",
      "..........YYY..........",
      "...........G...........",
      "..........GGH..........",
      ".........GGGHH.........",
      "........GGGGGHH........",
      ".......GGGGGGGHH.......",
      "......GGGGGGGGGHH......",
      ".........GGGHH.........",
      "........GGGGGHH........",
      ".......GGGGGGGHH.......",
      "......GGGGGGGGGHH......",
      ".....GGGGGGGGGGGHH.....",
      "....GGGGGGGGGGGGGHH....",
      ".......GGGGGGGHH.......",
      "......GGGGGGGGGHH......",
      ".....GGGGGGGGGGGHH.....",
      "....GGGGGGGGGGGGGHH....",
      "...GGGGGGGGGGGGGGGHH...",
      "..GGGGGGGGGGGGGGGGGHH..",
      ".GGGGGGGGGGGGGGGGGGGHH.",
      "..........TTT..........",
      "..........TTT..........",
      "........BBBBBBB........",
      "........BBBBBBB........",
    ],
    { Y: "#f2c14e", G: green, H: shade(green, -0.3), T: "#7a5534", B: "#b8a48a" }
  );
  const o = outline(s, "#1f3d28");
  const isiklar: [number, number, string][] = [
    [10, 7, "#ff5a5a"], [14, 9, "#ffd34d"], [8, 12, "#6ec6ff"], [13, 13, "#ff5a5a"],
    [17, 14, "#ffd34d"], [7, 17, "#ffd34d"], [11, 18, "#6ec6ff"], [16, 19, "#ff5a5a"],
    [5, 20, "#6ec6ff"], [19, 21, "#ffd34d"], [12, 21, "#ff5a5a"], [9, 15, "#ff9be0"],
  ];
  return {
    key: "agac",
    ...o,
    filament: green,
    glow: { cx: 12, cy: 2, r: 6, color: "#ffe28a" },
    extras: isiklar.map(([x, y, color], i) => ({ x, y, color, delay: 0.05 * i, blink: true })),
  };
}

export const SPRITES: Record<string, Sprite> = {
  vazo: vazo(),
  mantar: mantarLamba(),
  kedi: kedi(),
  saksi: saksi(),
  ay: ayLamba(),
  agac: agac(),
};
