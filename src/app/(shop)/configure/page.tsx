import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  ConfigurableCard,
  type ConfigurableProduct,
} from "@/components/configure/ConfigurableCard";
import { ArrowRight, Upload } from "lucide-react";

// Yapılandırılabilir ürünler nadiren değişir
export const revalidate = 600;

// ==========================================
// YAPILANDIR — KEŞİF SAYFASI
//
// Mağazadan kasıtlı olarak farklı bir deneyim:
// mağaza bir katalog, burası bir atölye.
//
// Mağaza:    ürün → fiyat → satın al
// Yapılandır: nesne → parametre → ölçü → üret
//
// Bu yüzden burada fiyat ikincil, ölçü aralığı
// birincil bilgidir; kartlar da o hiyerarşiyi kurar.
// ==========================================

export const metadata: Metadata = {
  title: "Yapılandır",
  description:
    "ADJY nesnelerini kendi ölçülerine göre yapılandır. Genişliği, yüksekliği ve malzemeyi değiştir, 3D önizlemede gör, üretime gönder.",
  alternates: { canonical: "/configure" },
  openGraph: {
    title: "Yapılandır | ADJY",
    description: "Bir nesne seç, ölçüsünü değiştir, sonucu gör, ürettir.",
  },
};

const STEPS = [
  "Bir nesne seç",
  "Ölçüsünü değiştir",
  "Sonucu 3D'de gör",
  "Üretime gönder",
];

async function getConfigurableProducts(): Promise<ConfigurableProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        parameters: {
          some: { type: "SLIDER", minValue: { not: null }, maxValue: { not: null } },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        thumbnailUrl: true,
        category: { select: { name: true } },
        parameters: {
          where: { type: "SLIDER", minValue: { not: null }, maxValue: { not: null } },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            displayName: true,
            minValue: true,
            maxValue: true,
            defaultValue: true,
            unit: true,
          },
        },
      },
    });

    return rows
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        basePrice: Number(p.basePrice),
        thumbnailUrl: p.thumbnailUrl,
        category: p.category,
        // Bozuk kayıtlar (min=max) kartta anlamsız bir ray çizerdi
        parameters: p.parameters
          .filter(
            (par) =>
              par.minValue !== null &&
              par.maxValue !== null &&
              par.maxValue > par.minValue
          )
          .map((par) => ({
            id: par.id,
            displayName: par.displayName,
            min: par.minValue as number,
            max: par.maxValue as number,
            default: Number(par.defaultValue) || (par.minValue as number),
            unit: par.unit,
          })),
      }))
      .filter((p) => p.parameters.length > 0);
  } catch {
    return [];
  }
}

export default async function ConfigurePage() {
  const products = await getConfigurableProducts();

  return (
    <div>
      {/* Giriş — atölye tonu, katalog değil */}
      <section className="border-b border-border bg-surface-2">
        <div className="adjy-container py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <p className="adjy-eyebrow mb-5">Yapılandır</p>
              <h1 className="adjy-display text-[clamp(2.25rem,5.4vw,4rem)]">
                Senin ölçün.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
                ADJY nesneleri sabit boyutta üretilmez. Bir nesne seç, ölçüsünü
                kendi alanına getir, sonucu gör ve üretime gönder.
              </p>
            </div>

            <ol className="flex flex-col justify-center divide-y divide-border border-y border-border">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-baseline gap-5 py-4">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-base">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Yapılandırılabilir nesneler */}
      <section className="adjy-container adjy-section" aria-label="Yapılandırılabilir nesneler">
        {products.length > 0 ? (
          <>
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-14">
              <div>
                <h2 className="adjy-display text-[clamp(1.75rem,3.4vw,2.5rem)]">
                  Yapılandırılabilir nesneler
                </h2>
                <p className="mt-3 text-[15px] text-muted-foreground">
                  {products.length} nesne · her biri kendi ölçü aralığında üretilir
                </p>
              </div>
              <Link
                href="/products"
                className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
              >
                Hazır nesnelere bak
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <ConfigurableCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </>
        ) : (
          <div className="border border-dashed border-border px-6 py-20 text-center">
            <p className="text-base font-medium">
              Yapılandırılabilir nesne bulunamadı
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Hazır nesnelere göz atabilir ya da kendi modelini yükleyebilirsin.
            </p>
            <Button asChild className="mt-6">
              <Link href="/products">Mağazaya git</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Kendi modeli olanlar için çıkış kapısı */}
      <section className="border-t border-border bg-surface" aria-label="Kendi modelini üret">
        <div className="adjy-container py-16 md:py-20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="adjy-display text-[clamp(1.5rem,3vw,2.25rem)]">
                Kendi modelin mi var?
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                Katalogda aradığın yoksa STL dosyanı yükle, üretim teklifini
                dakikalar içinde al.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href="/3d-baski-fiyati-hesapla">
                <Upload className="h-4 w-4" aria-hidden />
                Üretim teklifi al
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
