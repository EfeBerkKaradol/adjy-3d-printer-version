"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { ArrowRight } from "lucide-react";

// ==========================================
// YAPILANDIRILABİLİR NESNE KARTI
//
// Mağaza kartından kasıtlı olarak farklı:
// mağazada önce fiyat gelir, burada önce ÖLÇÜ ARALIĞI.
// Ziyaretçi "bu kaç para" değil, "bunu ne kadar
// değiştirebilirim" sorusunun cevabını görür.
// ==========================================

export interface ConfigurableParameter {
  id: string;
  displayName: string;
  min: number;
  max: number;
  default: number;
  unit: string | null;
}

export interface ConfigurableProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  thumbnailUrl: string | null;
  category: { name: string };
  parameters: ConfigurableParameter[];
}

/** Aralığın neresinde durduğunu gösteren minik ray */
function RangeBar({ param }: { param: ConfigurableParameter }) {
  const span = param.max - param.min;
  const percent = span > 0 ? ((param.default - param.min) / span) * 100 : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">{param.displayName}</span>
        <span className="font-mono text-xs tabular-nums">
          {param.min}–{param.max}
          {param.unit ? ` ${param.unit}` : ""}
        </span>
      </div>
      <div className="relative mt-2 h-px w-full bg-border">
        <span
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet"
          style={{ left: `${percent}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function ConfigurableCard({
  product,
  index = 0,
}: {
  product: ConfigurableProduct;
  index?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = product.thumbnailUrl && !imgError;

  return (
    <article className="group flex flex-col border border-border bg-surface">
      <Link href={`/configure/${product.id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
          {showImage ? (
            <Image
              src={product.thumbnailUrl as string}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={index < 3}
              onError={() => setImgError(true)}
              className="adjy-zoom object-cover"
            />
          ) : (
            <ProductImageFallback slug={product.slug} />
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="adjy-eyebrow">{product.category.name}</p>
          <h3 className="mt-2 text-lg font-medium tracking-tight">{product.name}</h3>

          {/* Asıl bilgi: neyi ne kadar değiştirebilirsin */}
          <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
            {product.parameters.slice(0, 3).map((param) => (
              <RangeBar key={param.id} param={param} />
            ))}
          </div>

          <div className="mt-auto flex items-baseline justify-between gap-4 pt-6">
            <span className="text-xs text-muted-foreground">
              Başlangıç{" "}
              <span className="font-medium tabular-nums text-foreground">
                {product.basePrice.toFixed(2)} TL
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              Yapılandır
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
