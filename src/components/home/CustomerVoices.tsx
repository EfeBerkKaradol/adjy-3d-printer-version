import Link from "next/link";
import { Star } from "lucide-react";

// ==========================================
// MÜŞTERİ SÖZÜ
//
// İyi mağazaların hepsinde var: başkası almış ve memnun kalmış
// olması, tanımadığın bir yerden alışveriş yapmanın en büyük
// engelini kaldırıyor.
//
// Ama uydurulmaz. Veritabanındaki yorumların tamamı sipariş
// vermiş gerçek müşterilerden süzülüyor; hiç yoksa bu bölüm
// çizilmez. Sahte bir övgü, hiç övgü olmamasından kötüdür —
// hem yanlış hem de fark edilir.
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

function Yildizlar({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${n} üzerinden 5 yıldız`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= n ? "fill-foreground text-foreground" : "text-border"
          }`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function CustomerVoices({ sozler, ortalama }: { sozler: Soz[]; ortalama: number }) {
  if (sozler.length === 0) return null;

  return (
    <section className="adjy-container adjy-section border-t border-border/60">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="adjy-eyebrow mb-4">Müşteriler ne dedi</p>
          <h2 className="adjy-display text-[clamp(1.4rem,2.6vw,2rem)]">
            Alanlar ne yazdı?
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Yildizlar n={Math.round(ortalama)} />
          <span className="text-sm tabular-nums text-muted-foreground">
            {ortalama.toFixed(1)} · {sozler.length} değerlendirme
          </span>
        </div>
      </div>

      <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {sozler.map((s) => (
          <li key={s.id} className="bg-background p-6">
            <Yildizlar n={s.rating} />
            {s.title && (
              <p className="mt-3 text-[15px] font-medium tracking-tight">{s.title}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {s.comment}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {s.author} ·{" "}
              <Link
                href={`/products/${s.productSlug}`}
                className="underline-offset-4 hover:underline"
              >
                {s.productName}
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
