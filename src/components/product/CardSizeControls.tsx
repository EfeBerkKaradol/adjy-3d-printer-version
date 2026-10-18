"use client";

import { useMemo, useState } from "react";
import { calculatePrice } from "@/lib/priceCalculator";
import { formatCmValue, MM_IN_CM } from "@/lib/units";

// ==========================================
// KART İÇİ ÖLÇÜ AYARI
//
// Ölçü değiştirmek ayrı bir sayfadaydı: "Yapılandır"a gidip
// ürünü bulman, sonra oynamaya başlaman gerekiyordu. Oysa
// insan ölçüyü, ürünü ilk gördüğü yerde merak ediyor.
//
// Kaydırıcı artık kartın altında. Çekince hem ölçü hem fiyat
// anında değişir; sepete eklenen de o ölçüdür. Fiyat
// hesabı ürün sayfasındakiyle aynı motordan geçer, iki yerde
// farklı rakam çıkmasın.
//
// Ölçüler cm gösterilir ama hesap mm üzerinden yürür —
// parametreler veritabanında mm.
// ==========================================

export interface KartParametre {
  name: string;
  displayName: string;
  /** SLIDER dışındaki parametrelerde (renk, metin) null gelir */
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string;
  step: number | null;
  unit: string | null;
  affectsPrice: boolean;
  priceFormula: string | null;
}

interface Props {
  basePrice: number;
  parameters: KartParametre[];
  /** Ölçü ya da fiyat değişince haber verir */
  onChange: (durum: {
    values: Record<string, number | string>;
    price: number;
  }) => void;
}

/** Kaydırıcıya gelen değeri aralığa ve adıma oturtur */
function oturt(ham: number, min: number, max: number, step: number): number {
  const sinirli = Math.min(max, Math.max(min, ham));
  if (step <= 0) return Math.round(sinirli);
  const basamak = min + Math.round((sinirli - min) / step) * step;
  return Number(Math.min(max, Math.max(min, basamak)).toFixed(2));
}

export function CardSizeControls({ basePrice, parameters, onChange }: Props) {
  // Yalnızca gerçek bir aralığı olan ölçü kaydırıcıları
  const olculer = useMemo(
    () =>
      parameters.filter(
        (p): p is KartParametre & { minValue: number; maxValue: number } =>
          (p.name === "width" || p.name === "height" || p.name === "depth") &&
          typeof p.minValue === "number" &&
          typeof p.maxValue === "number" &&
          p.maxValue > p.minValue
      ),
    [parameters]
  );

  // Sayısal olmayan parametreler (renk, metin) olduğu gibi taşınır:
  // Number("#ffffff") NaN verdiği için renk sepete 0 olarak gidiyordu.
  const [degerler, setDegerler] = useState<Record<string, number | string>>(() =>
    Object.fromEntries(
      parameters.map((p) => {
        const sayi = Number(p.defaultValue);
        return [
          p.name,
          Number.isFinite(sayi) && p.defaultValue.trim() !== ""
            ? sayi
            : p.defaultValue,
        ];
      })
    )
  );

  if (olculer.length === 0) return null;

  function guncelle(
    ad: string,
    ham: number,
    p: KartParametre & { minValue: number; maxValue: number }
  ) {
    const v = oturt(ham, p.minValue, p.maxValue, p.step ?? 1);
    const yeni = { ...degerler, [ad]: v };
    setDegerler(yeni);
    onChange({
      values: yeni,
      price: calculatePrice(
        basePrice,
        parameters.map((q) => ({
          name: q.name,
          affectsPrice: q.affectsPrice,
          priceFormula: q.priceFormula,
          defaultValue: q.defaultValue,
        })),
        yeni
      ),
    });
  }

  return (
    <div
      className="mt-3 space-y-2.5"
      // Kart bir bağlantının içinde: kaydırıcıya dokunmak ürün
      // sayfasını açmasın.
      onClick={(e) => e.preventDefault()}
    >
      {olculer.map((p) => {
        const ham = degerler[p.name];
        const v = typeof ham === "number" ? ham : p.minValue;
        const yuzde = ((v - p.minValue) / (p.maxValue - p.minValue)) * 100;
        return (
          <div key={p.name}>
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor={`olcu-${p.name}`}
                className="text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                {p.displayName}
              </label>
              <span className="text-[13px] font-medium tabular-nums">
                {formatCmValue(v)} cm
              </span>
            </div>
            <input
              id={`olcu-${p.name}`}
              type="range"
              min={p.minValue}
              max={p.maxValue}
              step={p.step ?? 1}
              value={v}
              onChange={(e) => guncelle(p.name, Number(e.target.value), p)}
              aria-label={`${p.displayName} (cm)`}
              className="adjy-mini-range mt-1.5 w-full"
              style={{ ["--dolu" as string]: `${yuzde}%` }}
            />
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
              <span>{formatCmValue(p.minValue)}</span>
              <span>{formatCmValue(p.maxValue)} cm</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { MM_IN_CM };
