import Link from "next/link";
import Image from "next/image";
import { Reveal } from "./Reveal";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { ArrowRight } from "lucide-react";

// ==========================================
// BÖLÜM 03 — ADJY NEDİR
// Üç aşamalı sistem: Keşfet · Yapılandır · Üret.
// Üç eş kart yerine editoryal bir kompozisyon:
// numaralar büyük, her adım kendi görseliyle,
// yerleşim sırayla yön değiştiriyor.
// ==========================================

export interface MethodProduct {
  name: string;
  slug: string;
  thumbnailUrl: string | null;
}

interface AdjyMethodProps {
  /** Her adımın yanında gösterilecek gerçek ürünler */
  products: MethodProduct[];
}

const STEPS = [
  {
    title: "Keşfet",
    body: "Dijital olarak tasarlanmış nesnelere göz at. Her biri bir dosya olarak başlar, stoktan değil.",
    href: "/products",
    action: "Nesneleri gör",
  },
  {
    title: "Yapılandır",
    body: "Ölçüyü, malzemeyi ve detayı kendi alanına göre ayarla. 3D önizlemede sonucu anında gör.",
    href: "/products?customizable=true",
    action: "Parametrik ürünler",
  },
  {
    title: "Üret",
    body: "Onayladığın konfigürasyon üretime girer. Seri üretim değil, talep üzerine tek tek.",
    href: "/3d-baski-fiyati-hesapla",
    action: "Üretim teklifi al",
  },
];

export function AdjyMethod({ products }: AdjyMethodProps) {
  return (
    <section id="adjy-yontem" className="adjy-container adjy-section" aria-label="ADJY nedir">
      <Reveal className="max-w-2xl">
        <p className="adjy-eyebrow mb-5">ADJY nedir</p>
        <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
          Bir nesnenin üç hâli.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          ADJY&apos;de bir ürün rafta beklemez. Dosya olarak durur, sen ölçüsünü
          verdiğinde üretilir.
        </p>
      </Reveal>

      <ol className="mt-16 space-y-20 md:mt-24 md:space-y-28">
        {STEPS.map((step, i) => {
          const product = products[i];
          const flipped = i % 2 === 1;

          return (
            <Reveal as="li" key={step.title} index={i}>
              <div
                className={`grid items-center gap-8 md:grid-cols-2 md:gap-16 ${
                  flipped ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Metin */}
                <div className="max-w-md">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="adjy-display mt-4 text-[clamp(1.75rem,3.4vw,2.75rem)]">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-base">
                    {step.body}
                  </p>
                  <Link
                    href={step.href}
                    className="group mt-7 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
                  >
                    {step.action}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </div>

                {/* Görsel */}
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                  {product?.thumbnailUrl ? (
                    <Image
                      src={product.thumbnailUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <ProductImageFallback slug={product?.slug ?? step.title} />
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </ol>
    </section>
  );
}
