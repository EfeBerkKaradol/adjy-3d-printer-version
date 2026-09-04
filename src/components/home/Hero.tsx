import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload } from "lucide-react";

// ==========================================
// BÖLÜM 01 — HERO
// Editoryal, asimetrik açılış. Solda tek cümlelik
// vaat ve iki eylem, sağda tam boy ürün görseli.
// Görsel yoksa sessiz bir geometrik zemin kullanılır;
// hiçbir koşulda kırık görsel gösterilmez.
// ==========================================

interface HeroProps {
  product?: {
    name: string;
    slug: string;
    thumbnailUrl: string | null;
    category: { name: string };
  } | null;
}

export function Hero({ product }: HeroProps) {
  return (
    <section className="border-b border-border" aria-labelledby="hero-title">
      <div className="adjy-container">
        <div className="grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:py-24">
          {/* Metin */}
          <div className="max-w-xl">
            <p className="adjy-eyebrow mb-6">Adaptive Design Joy</p>

            <h1
              id="hero-title"
              className="adjy-display text-[clamp(2.5rem,6.2vw,4.75rem)]"
            >
              Yaşadığın alana
              <br />
              göre tasarlandı.
            </h1>

            <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              Parametrik ürünler, özel ölçüler ve dijital üretim. Hazır bir
              tasarımı kendi ölçülerine getir ya da kendi modelini yükleyip
              ürettir.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/products">
                  Ürünleri keşfet
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/3d-baski-fiyati-hesapla">
                  <Upload className="h-4 w-4" aria-hidden />
                  Kendi modelini üret
                </Link>
              </Button>
            </div>
          </div>

          {/* Görsel */}
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-2 lg:aspect-[5/4]">
              {product?.thumbnailUrl ? (
                <Image
                  src={product.thumbnailUrl}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                  aria-hidden
                />
              )}
            </div>

            {product && (
              <Link
                href={`/products/${product.slug}`}
                className="mt-4 inline-flex items-baseline gap-3 text-sm transition-colors hover:text-muted-foreground"
              >
                <span className="adjy-eyebrow">{product.category.name}</span>
                <span className="font-medium">{product.name}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
