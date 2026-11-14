"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// ==========================================
// ÜRÜN SAYFASI GALERİSİ — TASARIM ÜRÜNLERİ
//
// Mağazadaki galeriyle aynı düzen: büyük görsel, altında küçük
// görsel şeridi. Farkı altyazı: bu ürünlerin tek bir hâli yok,
// her görsel başka bir yapılandırmayı gösteriyor ve hangisi
// olduğunu yazmak gerekiyor ("Sarmal doku, adaçayı yeşili").
// Müşteri gördüğünün hazır bir ürün değil, kurabileceği
// hâllerden biri olduğunu anlasın.
// ==========================================

interface Props {
  ad: string;
  gorseller: { adres: string; altyazi: string }[];
}

export function TasarimGalerisi({ ad, gorseller }: Props) {
  const [sira, setSira] = useState(0);
  const [bozuk, setBozuk] = useState<Record<number, boolean>>({});

  const secili = gorseller[sira] ?? gorseller[0];
  const saglam = gorseller.filter((_, i) => !bozuk[i]);

  if (!secili) return <div className="aspect-square bg-surface-2" />;

  return (
    <div>
      <figure>
        <div className="adjy-pixel-frame relative aspect-square overflow-hidden bg-surface-2">
          {!bozuk[sira] && (
            <Image
              key={secili.adres}
              src={secili.adres}
              alt={`${ad} — ${secili.altyazi}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              onError={() => setBozuk((b) => ({ ...b, [sira]: true }))}
              className="object-cover"
            />
          )}
        </div>
        <figcaption className="mt-3 flex items-baseline justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>{secili.altyazi}</span>
          {saglam.length > 1 && (
            <span className="tabular-nums">
              {sira + 1} / {gorseller.length}
            </span>
          )}
        </figcaption>
      </figure>

      {saglam.length > 1 && (
        <ul
          className="mt-3 grid grid-cols-4 gap-3"
          role="tablist"
          aria-label="Ürün görselleri"
        >
          {gorseller.map((g, i) =>
            bozuk[i] ? null : (
              <li key={g.adres}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === sira}
                  aria-label={`${ad}: ${g.altyazi}`}
                  onClick={() => setSira(i)}
                  className={cn(
                    "relative aspect-square w-full overflow-hidden bg-surface-2 transition-opacity",
                    i === sira ? "ring-2 ring-foreground" : "opacity-60 hover:opacity-100"
                  )}
                >
                  <Image
                    src={g.adres}
                    alt=""
                    fill
                    sizes="140px"
                    onError={() => setBozuk((b) => ({ ...b, [i]: true }))}
                    className="object-cover"
                  />
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
