"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

// ==========================================
// BÖLÜM 04 — PARAMETRİK KONFİGÜRATÖR
// ADJY ürünlerinin sabit nesneler olmadığını anlatır.
// Buradaki kaydırıcılar gerçek Parameter kayıtlarından
// (min/max/step/birim) beslenir ve seçilen değerler
// /customize sayfasına aktarılır — orada gerçek 3D
// önizleme ve fiyat hesabı devralır.
// Fiyat burada hesaplanmaz; tek fiyat kaynağı
// konfigüratörün kendisidir.
// ==========================================

export interface ShowcaseParameter {
  id: string;
  name: string;
  displayName: string;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string;
  step: number | null;
  unit: string | null;
}

export interface ConfiguratorShowcaseProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  thumbnailUrl: string | null;
  materialType: string | null;
  category: { name: string };
  parameters: ShowcaseParameter[];
}

interface ConfiguratorShowcaseProps {
  product: ConfiguratorShowcaseProduct;
}

export function ConfiguratorShowcase({ product }: ConfiguratorShowcaseProps) {
  // Yalnızca gerçekten sürüklenebilir parametreler kaydırıcı olur:
  // aralık tanımlı, max > min ve varsayılan değer sayısal olmalı.
  // (Veritabanında min=max=0 gibi bozuk kayıtlar bulunabiliyor.)
  const sliders = useMemo(
    () =>
      product.parameters
        .filter((p) => {
          const min = p.minValue;
          const max = p.maxValue;
          const def = Number(p.defaultValue);
          return (
            min !== null && max !== null && max > min && Number.isFinite(def)
          );
        })
        .slice(0, 3),
    [product.parameters]
  );

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(sliders.map((p) => [p.name, Number(p.defaultValue)]))
  );

  const customizeHref = useMemo(() => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) qs.set(key, String(value));
    const query = qs.toString();
    return `/customize/${product.id}${query ? `?${query}` : ""}`;
  }, [product.id, values]);

  if (sliders.length === 0) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Görsel */}
      <div className="relative aspect-square overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-[460px]">
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
            aria-hidden
          />
        )}

        <div className="absolute left-4 top-4">
          <Badge variant="customizable" className="bg-background/90 backdrop-blur-sm">
            Parametrik ürün
          </Badge>
        </div>
      </div>

      {/* Kontroller */}
      <div className="flex flex-col justify-center">
        <p className="adjy-eyebrow">{product.category.name}</p>
        <h3 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">
          {product.name}
        </h3>

        <dl className="mt-9 space-y-8">
          {sliders.map((param) => {
            const min = param.minValue as number;
            const max = param.maxValue as number;
            const value = values[param.name] ?? Number(param.defaultValue);
            const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
            const inputId = `showcase-${param.id}`;

            return (
              <div key={param.id}>
                <div className="flex items-baseline justify-between">
                  <dt>
                    <label
                      htmlFor={inputId}
                      className="adjy-eyebrow cursor-pointer text-foreground"
                    >
                      {param.displayName}
                    </label>
                  </dt>
                  <dd className="text-lg font-medium tabular-nums">
                    {value}
                    {param.unit && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        {param.unit}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="relative mt-3.5">
                  {/* Ray */}
                  <div className="h-px w-full bg-border" aria-hidden />
                  <div
                    className="absolute left-0 top-0 h-px bg-foreground"
                    style={{ width: `${percent}%` }}
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
                    style={{ left: `${percent}%` }}
                    aria-hidden
                  />
                  <input
                    id={inputId}
                    type="range"
                    min={min}
                    max={max}
                    step={param.step && param.step > 0 ? param.step : 1}
                    value={value}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [param.name]: Number(e.target.value) }))
                    }
                    aria-label={`${param.displayName}${param.unit ? ` (${param.unit})` : ""}`}
                    className="absolute inset-x-0 -top-3 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
                  />
                </div>

                <div className="mt-2.5 flex justify-between">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {min}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {max} {param.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </dl>

        {product.materialType && (
          <div className="mt-8 flex items-baseline justify-between border-t border-border pt-5">
            <span className="adjy-eyebrow">Malzeme</span>
            <span className="text-sm font-medium">{product.materialType}</span>
          </div>
        )}

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href={customizeHref}>
              Bu ürünü özelleştir
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-[16rem]">
            Fiyat, 3D önizleme ve AR konfigüratörde ölçüne göre hesaplanır.
          </p>
        </div>
      </div>
    </div>
  );
}
