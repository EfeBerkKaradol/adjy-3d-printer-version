import Link from "next/link";

// ==========================================
// MÜŞTERİ SÖZÜ — PİKSEL KARTLAR
//
// Ama uydurulmaz. Veritabanındaki yorumların tamamı sipariş
// vermiş gerçek müşterilerden süzülüyor; hiç yoksa bu bölüm
// çizilmez. Sahte bir övgü, hiç övgü olmamasından kötüdür.
//
// Görsel dil karşılamadaki yazıcıyla aynı: basamaklı köşeli
// piksel çerçeve, piksel yıldızlar, baş harften piksel avatar.
// ==========================================

export interface Soz {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  author: string;
  productName: string;
  productSlug: string;
}

/** 7×7 piksel yıldız */
const YILDIZ = [
  "...#...",
  "...#...",
  "#######",
  ".#####.",
  "..###..",
  ".##.##.",
  "##...##",
];

function PikselYildiz({ dolu }: { dolu: boolean }) {
  return (
    <svg
      viewBox="0 0 7 7"
      className={`h-3.5 w-3.5 ${dolu ? "text-foreground" : "text-foreground/15"}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
    >
      {YILDIZ.flatMap((s, y) =>
        [...s].map((ch, x) => (ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null))
      )}
    </svg>
  );
}

function Yildizlar({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${n} üzerinden 5 yıldız`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <PikselYildiz key={i} dolu={i <= n} />
      ))}
    </span>
  );
}

/** Piksel tırnak işareti */
function Tirnak() {
  return (
    <svg viewBox="0 0 9 6" className="h-5 w-auto" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
      <rect x="0" y="0" width="3" height="3" />
      <rect x="1" y="3" width="2" height="1" />
      <rect x="0" y="4" width="2" height="1" />
      <rect x="5" y="0" width="3" height="3" />
      <rect x="6" y="3" width="2" height="1" />
      <rect x="5" y="4" width="2" height="1" />
    </svg>
  );
}

export function CustomerVoices({ sozler, ortalama }: { sozler: Soz[]; ortalama: number }) {
  if (sozler.length === 0) return null;

  return (
    <section className="adjy-container adjy-section">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="adjy-eyebrow mb-4">Müşteriler</p>
          <h2 className="adjy-display text-[clamp(1.75rem,3.4vw,2.75rem)]">Alanlar ne yazdı?</h2>
        </div>
        <div className="adjy-pixel-box flex items-center gap-3 bg-background px-3 py-1.5">
          <Yildizlar n={Math.round(ortalama)} />
          <span className="font-mono text-xs tabular-nums">
            {ortalama.toFixed(1)}
            <span className="text-muted-foreground"> / 5 · {sozler.length} yorum</span>
          </span>
        </div>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sozler.map((s) => (
          <li key={s.id} className="adjy-pixel-card flex flex-col p-5">
            <div className="flex items-center justify-between">
              <Tirnak />
              <Yildizlar n={s.rating} />
            </div>
            {s.title && <p className="mt-4 text-[15px] font-semibold tracking-tight">{s.title}</p>}
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.comment}</p>
            <div className="mt-5 flex items-center gap-3 border-t-2 border-dashed border-foreground/80 pt-4">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center bg-foreground font-mono text-xs font-bold uppercase text-background"
                aria-hidden
              >
                {s.author.charAt(0)}
              </span>
              <div className="min-w-0 text-xs">
                <p className="font-semibold">{s.author}</p>
                <Link
                  href={`/products/${s.productSlug}`}
                  className="block truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground underline-offset-4 hover:underline"
                >
                  {s.productName}
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
