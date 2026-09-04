import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

// ==========================================
// BÖLÜM 07 — EDİTORYAL
// ADJY'yi bir pazar yeri değil, tasarım markası
// gibi konumlandıran tek büyük görsel + kısa metin.
// ==========================================

interface EditorialProps {
  image?: { url: string; alt: string } | null;
}

export function Editorial({ image }: EditorialProps) {
  return (
    <section className="border-t border-border" aria-labelledby="editorial-title">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-2 sm:aspect-[16/9] lg:aspect-[21/9]">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden
          />
        )}
      </div>

      <div className="adjy-container py-14 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <h2
            id="editorial-title"
            className="adjy-display text-[clamp(2rem,4.6vw,3.5rem)]"
          >
            Dijital çağın
            <br />
            nesneleri.
          </h2>

          <div className="max-w-lg">
            <p className="text-base leading-relaxed text-muted-foreground">
              Her ADJY ürünü bir dosya olarak başlar. Ölçüsü, dokusu ve malzemesi
              üretimden önce değiştirilebildiği için, aynı tasarım her eve farklı
              bir nesne olarak girer. Seri üretim değil; talep üzerine, tek tek.
            </p>

            <Link
              href="/collections"
              className="group mt-8 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
            >
              Koleksiyonları gör
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
