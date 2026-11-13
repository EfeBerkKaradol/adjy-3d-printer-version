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

// ==========================================
// KATALOĞUN GERİ KALANI
//
// Yukarıdaki altı nesne elle ayarlandı. Mağazadaki diğer her ürün
// için kategorisine uyan bir "tür" seçilir (vazo, saksı, lamba,
// raf, maket…) ve ürünün slug'ından türetilen sabit bir tohumla
// renk ve oranlar değiştirilir. Böylece her ürün kendine özgü ama
// her gösterimde aynı görünür.
// ==========================================

type Raw = { w: number; h: number; rows: Px[][] };

/** slug → 32 bit tohum */
function seedOf(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tohumlu, tekrarlanabilir rastgele sayı (mulberry32) */
function rngOf(seed: number) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // İlk birkaç değer yakın tohumlarda benzer çıkar; ısıtıp atılır
  for (let i = 0; i < 4; i++) next();
  return next;
}

type Rng = () => number;
const between = (r: Rng, a: number, b: number) => a + (b - a) * r();
const pick = <T,>(r: Rng, arr: T[]) => arr[Math.floor(r() * arr.length)];

const FILAMENT = [
  "#c4693f", "#e8a13a", "#93ad8e", "#3d8a55", "#efe6cc", "#5b7fb8",
  "#b85b7f", "#8a6fb8", "#d8d4ca", "#e2574c", "#4fa3a5", "#d9b26f",
];

/** Boş bir tuval ve üstüne kutu çizen yardımcılar */
function grid(w: number, h: number) {
  const rows: Px[][] = Array.from({ length: h }, () => Array<Px>(w).fill(null));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && y >= 0 && x < w && y < h) rows[Math.round(y)][Math.round(x)] = c;
  };
  /** Gölgeli kutu: üst ve sol açık, sağ koyu */
  const box = (x: number, y: number, bw: number, bh: number, c: string) => {
    for (let j = 0; j < bh; j++)
      for (let i = 0; i < bw; i++) {
        let col = c;
        if (i === bw - 1 && bw > 2) col = shade(c, -0.28);
        else if (i === 0 && bw > 2) col = shade(c, 0.22);
        if (j === 0 && bh > 2) col = shade(c, 0.3);
        set(x + i, y + j, col);
      }
  };
  return { w, h, rows, set, box };
}

function finish(key: string, raw: Raw, color: string, extra: Partial<Sprite> = {}): Sprite {
  return { key, ...outline(raw, shade(color, -0.6)), filament: color, ...extra };
}

function genVase(key: string, r: Rng): Sprite {
  const c = pick(r, FILAMENT);
  const h = Math.round(between(r, 22, 32));
  const body = revolve(
    h,
    curve([
      [0, between(r, 3.5, 6)],
      [between(r, 0.25, 0.5), between(r, 7, 11)],
      [between(r, 0.7, 0.82), between(r, 3, 5)],
      [1, between(r, 4, 6.5)],
    ]),
    c,
    { ring: r() < 0.5 ? (k) => k % 3 === 1 : undefined }
  );
  return finish(key, body, c);
}

function genPot(key: string, r: Rng): Sprite {
  const c = pick(r, FILAMENT);
  const top = between(r, 8.5, 11);
  const rim = revolve(2, () => top + 0.8, shade(c, 0.05));
  const body = revolve(Math.round(between(r, 12, 18)), curve([[0, top - between(r, 1.5, 3.5)], [1, top]]), c, {
    ring: r() < 0.5 ? (k) => k % 4 === 2 : undefined,
  });
  const parts: Raw[] = [rim, body];
  if (r() < 0.4) {
    const g = grid(Math.round(top * 1.6), 4);
    g.box(0, 0, 2, 4, shade(c, -0.3));
    g.box(g.w - 2, 0, 2, 4, shade(c, -0.3));
    parts.push(g);
  }
  const s = finish(key, stack(parts), c);
  const lc = Math.floor(s.w / 2);
  const leaf = "#4c8a45";
  const yap: [number, number][] = [[0, -1], [0, -2], [0, -3], [0, -4], [-1, -3], [-2, -4], [-3, -4], [1, -4], [2, -5], [3, -5], [0, -5], [-1, -6], [1, -6]];
  return {
    ...s,
    extras: yap.map(([dx, dy], i) => ({ x: lc + dx, y: dy, color: i % 3 ? leaf : "#79b46a", delay: 0.1 + Math.abs(dy) * 0.08 })),
  };
}

function genLamp(key: string, r: Rng): Sprite {
  const c = pick(r, ["#e8a13a", "#efe6cc", "#d9b26f", "#f2d27a", "#e2574c"]);
  const tur = pick(r, ["kubbe", "kure", "mantar"]);
  const tabanR = between(r, 5, 7);
  const base = revolve(3, () => tabanR, "#8b6a4a", { ring: (k) => k === 2 });
  let s: Sprite;
  if (tur === "kure") {
    const R = between(r, 9, 11.5);
    const sphere = revolve(Math.round(R * 2), (f) => R * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.5) / 0.52, 2))), c);
    s = finish(key, stack([sphere, base]), c, { glow: { cx: 0, cy: R, r: 17, color: "#fff0c0" } });
  } else {
    const capR = between(r, 9, 13);
    const cap = revolve(
      Math.round(between(r, 9, 13)),
      tur === "kubbe"
        ? (f) => capR * Math.sqrt(Math.max(0, 1 - f * f * 0.92))
        : (f) => (f < 0.12 ? capR : capR * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.12) / 0.9, 2)))),
      c
    );
    const sapR = between(r, 1.4, 2.6);
    const stem = revolve(Math.round(between(r, 10, 16)), () => sapR, "#d8d4ca");
    s = finish(key, stack([cap, stem, base]), c, { glow: { cx: 0, cy: 6, r: 17, color: "#ffd47a" } });
  }
  if (s.glow) s.glow.cx = s.w / 2;
  return s;
}

function genFigure(key: string, r: Rng): Sprite {
  const c = pick(r, ["#f1efe9", "#d8d4ca", "#2f2f33", "#c4693f", "#93ad8e", "#efe6cc", "#5b7fb8"]);
  if (r() < 0.5) {
    // Kedi silueti, rengi değişir
    const k = kedi();
    const rows = k.rows.map((row) =>
      row.map((v) => (v === "#f1efe9" ? c : v === "#cbc7bc" ? shade(c, -0.18) : v))
    );
    return { ...k, key, rows, filament: c };
  }
  // Soyut büst: kaide, gövde, baş
  const head = revolve(9, (f) => 4.3 * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.5) / 0.55, 2))), c);
  const neck = revolve(2, () => 1.6, c);
  const body = revolve(Math.round(between(r, 10, 14)), curve([[0, 5], [0.6, 7.5], [1, 3]]), c);
  const base = revolve(3, () => 7, shade(c, -0.25));
  return finish(key, stack([head, neck, body, base]), c);
}

function genCandle(key: string, r: Rng): Sprite {
  const c = pick(r, FILAMENT);
  const candle = revolve(Math.round(between(r, 7, 11)), () => 2.4, "#f5f1e6");
  const holder = revolve(Math.round(between(r, 10, 16)), curve([[0, 6.5], [0.3, 3], [0.75, 2.6], [1, 5]]), c);
  const s = finish(key, stack([candle, holder]), c);
  const cx = Math.floor(s.w / 2);
  return {
    ...s,
    glow: { cx, cy: -2, r: 10, color: "#ffcf6b" },
    extras: [
      { x: cx, y: -1, color: "#ffb347", delay: 0.2 },
      { x: cx, y: -2, color: "#ffd77a", delay: 0.25, blink: true },
      { x: cx, y: -3, color: "#fff1b8", delay: 0.3, blink: true },
    ],
  };
}

function genBowl(key: string, r: Rng): Sprite {
  const c = pick(r, FILAMENT);
  const top = between(r, 13, 18);
  const body = revolve(Math.round(between(r, 8, 13)), curve([[0, between(r, 4, 7)], [1, top]]), c, {
    ring: r() < 0.6 ? (k) => k % 3 === 0 : undefined,
  });
  const ayakR = between(r, 4, 6);
  const foot = revolve(2, () => ayakR, shade(c, -0.2));
  return finish(key, stack([body, foot]), c);
}

function genOrnament(key: string, r: Rng): Sprite {
  const c = pick(r, ["#e2574c", "#3d8a55", "#e8a13a", "#5b7fb8", "#b85b7f", "#efe6cc"]);
  const R = between(r, 8, 11);
  const ball = revolve(Math.round(R * 2), (f) => R * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.5) / 0.52, 2))), c, {
    ring: (k) => k === Math.round(R) || k === Math.round(R) + 1,
  });
  const cap = revolve(3, () => 2.4, "#d9b26f");
  const hook = revolve(2, () => 0.6, "#9b9ba4");
  return finish(key, stack([hook, cap, ball]), c);
}

function genStand(key: string, r: Rng): Sprite {
  const c = pick(r, FILAMENT);
  const W = Math.round(between(r, 22, 30));
  const H = Math.round(between(r, 18, 26));
  const g = grid(W, H);
  g.box(0, H - 3, W, 3, c); // taban
  for (let y = 0; y < H - 3; y++) {
    // geriye yaslanan sırt
    const x = Math.round(W * 0.55 + (H - 3 - y) * 0.45);
    g.box(Math.min(W - 3, x), y, 3, 1, c);
  }
  g.box(2, H - 6, 3, 3, c); // ön tırnak
  return finish(key, g, c);
}

function genOrganizer(key: string, r: Rng): Sprite {
  const c = pick(r, FILAMENT);
  const W = Math.round(between(r, 24, 34));
  const g = grid(W, 24);
  const kH = Math.round(between(r, 9, 13));
  g.box(0, 24 - kH, W, kH, c);
  const n = Math.round(between(r, 2, 4));
  for (let i = 1; i < n; i++) {
    const x = Math.round((W / n) * i);
    for (let y = 24 - kH + 1; y < 24; y++) g.set(x, y, shade(c, -0.35));
  }
  // kalemler: sol bölmeden yukarı uzanır
  const kalem = ["#e2574c", "#5b7fb8", "#e8a13a", "#2f2f33"];
  for (let i = 0; i < 4; i++) {
    const x = 3 + i * 3;
    const len = Math.round(between(r, 6, 11));
    for (let y = 0; y < len; y++) g.set(x, 24 - kH - 1 - y, kalem[i]);
  }
  return finish(key, g, c);
}

function genShelf(key: string, r: Rng): Sprite {
  const c = pick(r, ["#d9b26f", "#efe6cc", "#2f2f33", "#93ad8e", "#d8d4ca", "#c4693f"]);
  const W = Math.round(between(r, 30, 42));
  const H = Math.round(between(r, 20, 28));
  const g = grid(W, H);
  const kat = r() < 0.5 ? 2 : 3;
  g.box(0, 0, 3, H, c);
  g.box(W - 3, 0, 3, H, c);
  for (let i = 0; i <= kat; i++) g.box(0, Math.round(((H - 3) / kat) * i), W, 3, c);
  // raftaki küçük nesneler
  const renk = ["#3d8a55", "#e2574c", "#5b7fb8", "#e8a13a"];
  for (let i = 0; i < kat; i++) {
    const y = Math.round(((H - 3) / kat) * (i + 1));
    const x = Math.round(between(r, 5, W - 10));
    g.box(x, y - 4, 3, 4, renk[i % 4]);
    g.box(x + 4, y - 3, 2, 3, renk[(i + 2) % 4]);
  }
  return finish(key, g, c);
}

function genPegboard(key: string, r: Rng): Sprite {
  const c = pick(r, ["#d8d4ca", "#2f2f33", "#5b7fb8", "#93ad8e", "#efe6cc"]);
  const W = Math.round(between(r, 30, 40));
  const H = Math.round(between(r, 24, 30));
  const g = grid(W, H);
  g.box(0, 0, W, H, c);
  for (let y = 3; y < H - 2; y += 3) for (let x = 3; x < W - 2; x += 3) g.set(x, y, shade(c, -0.45));
  // asılı bir alet
  g.box(Math.round(W * 0.3), 6, 2, 9, "#e8a13a");
  g.box(Math.round(W * 0.62), 5, 5, 2, "#9b9ba4");
  g.box(Math.round(W * 0.62) + 1, 7, 3, 6, "#e2574c");
  return finish(key, g, c);
}

function genBoxes(key: string, r: Rng): Sprite {
  const c = pick(r, FILAMENT);
  const W = Math.round(between(r, 22, 30));
  const n = r() < 0.5 ? 2 : 3;
  const kH = Math.round(between(r, 8, 10));
  const g = grid(W, kH * n);
  for (let i = 0; i < n; i++) {
    const cc = i % 2 ? shade(c, -0.12) : c;
    g.box(0, i * kH, W, kH, cc);
    g.box(Math.round(W / 2) - 3, i * kH + 3, 6, 2, shade(cc, -0.35)); // tutamak
  }
  return finish(key, g, c);
}

function genBuilding(key: string, r: Rng): Sprite {
  const c = pick(r, ["#efe6cc", "#d8d4ca", "#d9b26f", "#c4693f", "#9b9ba4"]);
  const tur = pick(r, ["antik", "kule", "modern"]);
  if (tur === "antik") {
    const W = 33;
    const g = grid(W, 26);
    for (let i = 0; i < 8; i++) for (let x = 16 - i * 2; x <= 16 + i * 2; x++) g.set(x, i, i === 0 ? shade(c, 0.3) : c); // alınlık
    g.box(0, 8, W, 2, shade(c, -0.1));
    for (let k = 0; k < 4; k++) g.box(3 + k * 8, 10, 3, 13, c); // sütunlar
    g.box(0, 23, W, 3, shade(c, -0.15));
    return finish(key, g, c);
  }
  if (tur === "kule") {
    const g = grid(19, 34);
    for (let y = 0; y < 12; y++) {
      const half = Math.round((y / 12) * 4);
      for (let x = 9 - half; x <= 9 + half; x++) g.set(x, y, c);
    }
    g.box(4, 12, 11, 22, c);
    g.box(0, 22, 19, 12, shade(c, -0.08));
    for (let y = 15; y < 30; y += 5) g.box(8, y, 3, 3, "#2f2f33"); // pencereler
    return finish(key, g, c);
  }
  const g = grid(30, 32);
  const kat = [[0, 30, 10], [3, 24, 10], [6, 18, 12]] as const;
  let y = 32;
  for (const [x, w, h] of kat) {
    y -= h;
    g.box(x, y, w, h, c);
    for (let yy = y + 2; yy < y + h - 1; yy += 3) for (let xx = x + 2; xx < x + w - 2; xx += 3) g.set(xx, yy, "#5b7fb8");
  }
  return finish(key, g, c);
}

function genFurniture(key: string, r: Rng): Sprite {
  const c = pick(r, ["#d9b26f", "#c4693f", "#efe6cc", "#2f2f33", "#93ad8e"]);
  const tur = pick(r, ["sandalye", "masa", "dolap"]);
  if (tur === "sandalye") {
    const g = grid(18, 30);
    g.box(12, 0, 3, 30, c); // sırt
    g.box(0, 15, 15, 3, c); // oturak
    g.box(1, 18, 2, 12, c);
    g.box(12, 18, 2, 12, c);
    return finish(key, g, c);
  }
  if (tur === "masa") {
    const g = grid(40, 20);
    g.box(0, 0, 40, 3, c);
    g.box(3, 3, 3, 17, c);
    g.box(34, 3, 3, 17, c);
    g.box(8, 3, 24, 2, shade(c, -0.15));
    return finish(key, g, c);
  }
  const g = grid(28, 32);
  g.box(0, 0, 28, 29, c);
  g.box(2, 2, 11, 25, shade(c, -0.08));
  g.box(15, 2, 11, 25, shade(c, -0.08));
  g.set(12, 14, "#9b9ba4");
  g.set(15, 14, "#9b9ba4");
  g.box(1, 29, 3, 3, shade(c, -0.3));
  g.box(24, 29, 3, 3, shade(c, -0.3));
  return finish(key, g, c);
}

function genRooting(key: string, r: Rng): Sprite {
  const c = pick(r, ["#d9b26f", "#2f2f33", "#efe6cc", "#93ad8e"]);
  const g = grid(29, 26);
  g.box(0, 23, 29, 3, c);
  g.box(1, 2, 3, 21, c);
  g.box(25, 2, 3, 21, c);
  g.box(1, 2, 27, 3, c);
  for (let i = 0; i < 3; i++) {
    const x = 7 + i * 6;
    g.box(x, 5, 3, 14, "#bfe3ee"); // cam tüp
    for (let y = 12; y < 19; y++) g.set(x + 1, y, "#8cc9db");
  }
  const s = finish(key, g, c);
  return {
    ...s,
    extras: [0, 1, 2].flatMap((i) => [
      { x: 9 + i * 6, y: 5, color: "#4c8a45", delay: 0.2 + i * 0.15 },
      { x: 9 + i * 6, y: 4, color: "#79b46a", delay: 0.3 + i * 0.15 },
      { x: 10 + i * 6, y: 3, color: "#4c8a45", delay: 0.4 + i * 0.15 },
    ]),
  };
}

const URETECI: Record<string, (key: string, r: Rng) => Sprite> = {
  vazo: genVase,
  saksi: genPot,
  koklendirme: genRooting,
  lamba: genLamp,
  figur: genFigure,
  samdan: genCandle,
  kase: genBowl,
  sus: genOrnament,
  stand: genStand,
  duzenleyici: genOrganizer,
  raf: genShelf,
  pano: genPegboard,
  kutu: genBoxes,
  maket: genBuilding,
  mobilya: genFurniture,
};

/** Kategori slug'ından (alt ya da ana) sprite türü */
export function kindForCategory(slugs: (string | null | undefined)[]): string {
  const s = slugs.filter(Boolean).join(" ");
  const kural: [RegExp, string][] = [
    [/koklendirme/, "koklendirme"],
    [/saksi/, "saksi"],
    [/vazo/, "vazo"],
    [/aydinlatma|lamba/, "lamba"],
    [/biblo|heykel|hobi|alci|figur/, "figur"],
    [/samdan|tutsu/, "samdan"],
    [/kase|tepsi/, "kase"],
    [/sus/, "sus"],
    [/stand/, "stand"],
    [/duzenleyici|ofis/, "duzenleyici"],
    [/raf/, "raf"],
    [/pano/, "pano"],
    [/kutu|depolama|duzen/, "kutu"],
    [/maket|mimari/, "maket"],
    [/mobilya/, "mobilya"],
    [/dekor/, "figur"],
  ];
  for (const [re, k] of kural) if (re.test(s)) return k;
  return "vazo";
}

const CACHE = new Map<string, Sprite>();

/**
 * Sprite anahtarı: elle çizilmiş altı nesneden biri ("vazo") ya da
 * "tür:slug" ("raf:kose-rafi"). Üretilenler önbellekte tutulur.
 */
export function spriteFor(key: string): Sprite {
  const hazir = SPRITES[key];
  if (hazir) return hazir;
  const kayitli = CACHE.get(key);
  if (kayitli) return kayitli;
  const [tur, ...rest] = key.split(":");
  const uret = URETECI[tur] ?? genVase;
  const s = uret(key, rngOf(seedOf(rest.join(":") || key)));
  CACHE.set(key, s);
  return s;
}
