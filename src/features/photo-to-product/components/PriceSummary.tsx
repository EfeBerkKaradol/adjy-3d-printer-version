"use client";

import { useState } from "react";
import { formatPrintTime, formatTRY } from "@/lib/slicer";
import type { GeneratedPricing } from "../services/pricing";

// ==========================================
// FİYAT ÖZETİ
//
// Öne çıkan tek sayı KDV dahil birim fiyat. Ağırlık ve süre
// yanında durur; kalem kalem döküm isteyen açar.
// ==========================================

export function PriceSummary({
  pricing,
  quantity,
}: {
  pricing: GeneratedPricing;
  quantity: number;
}) {
  const [open, setOpen] = useState(false);
  const { price, estimate } = pricing;

  return (
    <section className="border-t border-border pt-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Fiyat</p>
          <p className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums">
            {formatTRY(price.unitPriceGross)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">KDV dahil, adet başına</p>
        </div>
        <dl className="text-right text-xs text-muted-foreground">
          <div className="flex justify-end gap-2">
            <dt>Tahmini ağırlık</dt>
            <dd className="tabular-nums text-foreground">{estimate.weightGrams.toFixed(0)} g</dd>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <dt>Tahmini üretim</dt>
            <dd className="tabular-nums text-foreground">
              {formatPrintTime(estimate.printTimeMinutes)}
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {open ? "Dökümü gizle" : "Fiyat nasıl oluşuyor?"}
      </button>

      {open && (
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Birim (KDV hariç)</dt>
            <dd className="tabular-nums">{formatTRY(price.unitPriceNet)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">KDV</dt>
            <dd className="tabular-nums">{formatTRY(price.unitVat)}</dd>
          </div>
          {price.discountRate > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Adet indirimi</dt>
              <dd className="tabular-nums">%{Math.round(price.discountRate * 100)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1.5 font-medium">
            <dt>Toplam · {quantity} adet</dt>
            <dd className="tabular-nums">{formatTRY(price.totalGross)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
