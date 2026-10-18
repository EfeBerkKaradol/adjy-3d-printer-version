"use client";

import { Check } from "lucide-react";
import { FILAMENT_COLORS } from "@/lib/slicer";
import { formatCmValue } from "@/lib/units";

// ==========================================
// ÜRÜN SEÇENEKLERİ
//
// Ölçüler ürün sayfasında yalnızca okunur bir listeydi —
// "81 – 216 mm (varsayılan 135 mm)" — ve değiştirmek için
// ayrı bir sayfaya gitmek gerekiyordu. Oysa insan ölçüyü
// ürünü gördüğü yerde merak ediyor.
//
// Kaydırıcılar ve renkler artık burada, açık hâlde. Tıklanacak
// bir "özelleştir" adımı yok; sayfa zaten o.
// ==========================================

export interface SecenekParametre {
  name: string;
  displayName: string;
  type: string;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string;
  step: number | null;
  unit: string | null;
}

interface Props {
  parameters: SecenekParametre[];
  values: Record<string, number | string>;
  onChange: (ad: string, deger: number | string) => void;
}

const OLCU_ADLARI = new Set(["width", "height", "depth"]);

/** Kaydırıcı değerini aralığa ve adıma oturtur */
function oturt(ham: number, min: number, max: number, step: number): number {
  const sinirli = Math.min(max, Math.max(min, ham));
  if (step <= 0) return Math.round(sinirli);
  const basamak = min + Math.round((sinirli - min) / step) * step;
  return Number(Math.min(max, Math.max(min, basamak)).toFixed(2));
}

export function ProductOptions({ parameters, values, onChange }: Props) {
  const olculer = parameters.filter(
    (p): p is SecenekParametre & { minValue: number; maxValue: number } =>
      OLCU_ADLARI.has(p.name) &&
      typeof p.minValue === "number" &&
      typeof p.maxValue === "number" &&
      p.maxValue > p.minValue
  );
  const renk = parameters.find((p) => p.type === "COLOR");

  if (olculer.length === 0 && !renk) return null;

  return (
    <div className="space-y-7">
      {renk && (
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="adjy-eyebrow">Renk</h2>
            <span className="text-sm text-muted-foreground">
              {FILAMENT_COLORS.find((c) => c.id === values[renk.name])?.name ?? "Beyaz"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILAMENT_COLORS.map((c) => {
              const secili = values[renk.name] === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange(renk.name, c.id)}
                  aria-label={c.name}
                  aria-pressed={secili}
                  title={c.name}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-105 ${
                    secili ? "border-foreground" : "border-border"
                  }`}
                >
                  <span
                    className="h-7 w-7 rounded-full"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden
                  />
                  {secili && (
                    <Check
                      className="absolute h-4 w-4"
                      /* Açık renklerde beyaz tik görünmüyor */
                      style={{ color: c.id === "siyah" || c.id === "mor" ? "#fff" : "#111" }}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {olculer.length > 0 && (
        <div className="space-y-5">
          <h2 className="adjy-eyebrow">Ölçü</h2>
          {olculer.map((p) => {
            const ham = values[p.name];
            const v = typeof ham === "number" ? ham : Number(p.defaultValue);
            const yuzde = ((v - p.minValue) / (p.maxValue - p.minValue)) * 100;
            const varsayilan = Number(p.defaultValue);
            return (
              <div key={p.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={`pdp-${p.name}`} className="text-sm">
                    {p.displayName}
                  </label>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCmValue(v)} cm
                    {Math.abs(v - varsayilan) > 0.01 && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (standart {formatCmValue(varsayilan)})
                      </span>
                    )}
                  </span>
                </div>
                <input
                  id={`pdp-${p.name}`}
                  type="range"
                  min={p.minValue}
                  max={p.maxValue}
                  step={p.step ?? 1}
                  value={v}
                  onChange={(e) =>
                    onChange(
                      p.name,
                      oturt(Number(e.target.value), p.minValue, p.maxValue, p.step ?? 1)
                    )
                  }
                  aria-label={`${p.displayName} (cm)`}
                  className="adjy-mini-range mt-2.5 w-full"
                  style={{ ["--dolu" as string]: `${yuzde}%` }}
                />
                <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
                  <span>{formatCmValue(p.minValue)}</span>
                  <span>{formatCmValue(p.maxValue)} cm</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
