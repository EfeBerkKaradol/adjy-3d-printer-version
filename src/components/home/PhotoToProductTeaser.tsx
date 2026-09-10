import Link from "next/link";
import { ArrowRight, Camera, Box, ScanLine } from "lucide-react";

// ==========================================
// FOTOĞRAFTAN ÜRÜNE — ANA SAYFA TANITIMI
//
// Ana sayfayı bu özellikle doldurmuyoruz: tek bir bölüm,
// üç adımlık görsel hikâye ve tek bir çağrı. Bilerek statik —
// 3D ya da animasyon yok, ana sayfanın açılışını yavaşlatmasın.
// ==========================================

const STEPS = [
  {
    n: "01",
    title: "Fotoğrafla",
    body: "Beğendiğin objeyi çek.",
    Icon: Camera,
  },
  {
    n: "02",
    title: "3D modele dönüşsün",
    body: "Ölçüsünü sen belirle.",
    Icon: Box,
  },
  {
    n: "03",
    title: "Odanda gör",
    body: "Sonra üretime gönder.",
    Icon: ScanLine,
  },
] as const;

export function PhotoToProductTeaser() {
  return (
    <section
      className="border-y border-border bg-surface"
      aria-label="Fotoğraftan ürün oluştur"
    >
      <div className="adjy-container adjy-section">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <div>
            <p className="adjy-eyebrow mb-5">Üret</p>
            <h2 className="adjy-display text-[clamp(1.75rem,3.6vw,2.75rem)]">
              Beğendiğin şeyi fotoğrafla.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Bir fotoğraf yükle. ADJY onu 3D modele dönüştürsün. Ölçüsünü değiştir,
              odanda gör ve üret.
            </p>
            <Link
              href="/uret/fotograftan-olustur"
              className="group mt-7 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
            >
              Fotoğraftan Oluştur
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>

          <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {STEPS.map(({ n, title, body, Icon }) => (
              <li key={n} className="bg-background p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {n}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-8 text-[15px] font-medium tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
