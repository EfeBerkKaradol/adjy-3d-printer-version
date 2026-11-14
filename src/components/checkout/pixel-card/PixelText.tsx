// ==========================================
// PİKSEL YAZI
// 5×7'lik bitmap yazı tipi. Kartın üzerindeki numara, isim ve
// tarih bununla çizilir; her karakter ayrı bir SVG olduğundan
// yeni yazılan karakter kendi "basılma" animasyonunu oynatır.
// ==========================================

const GLYPHS: Record<string, string> = {
  A: ".###.#...##...#######...##...##...#",
  B: "####.#...##...#####.#...##...#####.",
  C: ".###.#...##....#....#....#...#.###.",
  D: "####.#...##...##...##...##...#####.",
  E: "######....#....####.#....#....#####",
  F: "######....#....####.#....#....#....",
  G: ".###.#...##....#.####...##...#.####",
  H: "#...##...##...#######...##...##...#",
  I: ".###...#....#....#....#....#...###.",
  J: "..###...#....#....#....#.#..#..##..",
  K: "#...##..#.#.#..##...#.#..#..#.#...#",
  L: "#....#....#....#....#....#....#####",
  M: "#...###.###.#.##.#.##...##...##...#",
  N: "#...##...###..##.#.##..###...##...#",
  O: ".###.#...##...##...##...##...#.###.",
  P: "####.#...##...#####.#....#....#....",
  Q: ".###.#...##...##...##.#.##..#..##.#",
  R: "####.#...##...#####.#.#..#..#.#...#",
  S: ".#####....#.....###.....#....#####.",
  T: "#####..#....#....#....#....#....#..",
  U: "#...##...##...##...##...##...#.###.",
  V: "#...##...##...##...##...#.#.#...#..",
  W: "#...##...##...##.#.##.#.##.#.#.#.#.",
  X: "#...##...#.#.#...#...#.#.#...##...#",
  Y: "#...##...#.#.#...#....#....#....#..",
  Z: "#####....#...#...#...#...#....#####",
  "0": ".###.#...##..###.#.###..##...#.###.",
  "1": "..#...##....#....#....#....#...###.",
  "2": ".###.#...#....#...#...#...#...#####",
  "3": "#####...#...#.....#.....##...#.###.",
  "4": "...#...##..#.#.#..#.#####...#....#.",
  "5": "######....####.....#....##...#.###.",
  "6": "..##..#...#....####.#...##...#.###.",
  "7": "#####....#...#...#...#....#....#...",
  "8": ".###.#...##...#.###.#...##...#.###.",
  "9": ".###.#...##...#.####....#...#..##..",
  "/": "....#....#...#...#...#...#....#....",
  "-": "...............#####...............",
  ".": "..............................##...",
  "•": "...........###..###..###...........",
  "#": "...........###..###..###...........",
  _: "..............................#####",
  " ": "",
};

const W = 5;
const H = 7;

// Türkçe harfler kart baskısındaki gibi Latin karşılığına iner
const FOLD: Record<string, string> = {
  Ç: "C", Ğ: "G", İ: "I", I: "I", Ö: "O", Ş: "S", Ü: "U",
  ç: "C", ğ: "G", ı: "I", i: "I", ö: "O", ş: "S", ü: "U",
};

function glyphPath(ch: string): string {
  const g = (GLYPHS[ch] ?? "").padEnd(W * H, ".");
  let d = "";
  for (let i = 0; i < W * H; i++) {
    if (g[i] === "#") d += `M${i % W} ${Math.floor(i / W)}h1v1h-1z`;
  }
  return d;
}

const PATHS = new Map<string, string>();
function pathFor(ch: string) {
  let p = PATHS.get(ch);
  if (p === undefined) {
    p = glyphPath(ch);
    PATHS.set(ch, p);
  }
  return p;
}

export function normalizePixelText(text: string) {
  return Array.from(text)
    .map((c) => FOLD[c] ?? c.toUpperCase())
    .map((c) => (c in GLYPHS ? c : " "))
    .join("");
}

interface PixelTextProps {
  text: string;
  /** Bir pikselin boyu (CSS uzunluğu) */
  size?: string;
  className?: string;
  /** Yeni yazılan karakter basılma animasyonu oynasın mı */
  animate?: boolean;
  /** Bu indeksten sonraki karakterler soluk (yer tutucu) */
  dimFrom?: number;
}

export function PixelText({
  text,
  size = "2px",
  className,
  animate = false,
  dimFrom,
}: PixelTextProps) {
  const chars = Array.from(normalizePixelText(text));
  return (
    <span
      className={className}
      aria-hidden
      style={{ display: "inline-flex", gap: size, lineHeight: 0 }}
    >
      {chars.map((ch, i) => (
        <svg
          // Karakter değişince yeniden takılır → animasyon yeniden oynar
          key={animate ? `${i}-${ch}` : i}
          viewBox={`0 0 ${W} ${H}`}
          shapeRendering="crispEdges"
          className={animate ? "adjy-paycard-glyph" : undefined}
          style={{
            width: `calc(${size} * ${W})`,
            height: `calc(${size} * ${H})`,
            opacity: dimFrom !== undefined && i >= dimFrom ? 0.45 : 1,
            flex: "none",
          }}
        >
          <path d={pathFor(ch)} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}
