"use client";

import { useState } from "react";

// ==========================================
// PARAMETRE KAYDIRICISI
//
// Görünüş tamamen özel ama altında gerçek bir
// <input type="range"> var: klavye (ok tuşları,
// Home/End), ekran okuyucu ve dokunma desteği
// tarayıcıdan bedava gelir. Div'lerden slider
// taklidi yapmak bunların hepsini kaybettirirdi.
//
// Değer iki yoldan değiştirilebilir — kaydırıcı ve
// sayı kutusu — ikisi de aynı state'e bağlıdır.
// ==========================================

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string | null;
  onChange: (value: number) => void;
}

/** Değeri aralığa ve adıma oturt */
function clampToStep(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  if (step <= 0) return Math.round(clamped);
  const snapped = min + Math.round((clamped - min) / step) * step;
  // Kayan nokta artıklarını temizle (0.1 adımlarında 180.30000000000004 olmasın)
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
}

export function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: ParameterSliderProps) {
  // Sayı kutusu serbest yazmaya izin verir; değer yalnızca
  // blur/Enter'da işlenir, yoksa "18" yazarken 18 mm'ye atlar.
  //
  // draft === null iken kutu doğrudan gerçek değeri gösterir.
  // Böylece kaydırıcı sürüklenirken kutu effect'e gerek kalmadan
  // kendiliğinden güncel kalır.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const inputId = `param-${label.replace(/\s+/g, "-").toLowerCase()}`;

  function commitDraft() {
    if (draft === null) return;
    const parsed = Number(draft);
    setDraft(null); // düzenleme bitti, kutu yine gerçek değeri gösterir
    if (!Number.isFinite(parsed)) return;
    const next = clampToStep(parsed, min, max, step);
    if (next !== value) onChange(next);
  }

  return (
    <div className="group/slider">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="adjy-eyebrow cursor-pointer text-foreground">
          {label}
        </label>

        {/* Doğrudan değer girişi — kaydırıcıyla aynı state */}
        <div className="flex items-baseline gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={shown}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label={`${label} değeri${unit ? ` (${unit})` : ""}`}
            className="w-16 border-b border-border bg-transparent pb-0.5 text-right font-mono text-base tabular-nums outline-none transition-colors focus:border-foreground"
          />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>

      {/* Ray */}
      <div className="relative mt-4 h-5">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
        <div
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-foreground transition-[width] duration-75"
          style={{ width: `${percent}%` }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-transform duration-150 group-hover/slider:scale-150 group-focus-within/slider:scale-150"
          style={{ left: `${percent}%` }}
          aria-hidden
        />

        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${value}${unit ? ` ${unit}` : ""}`}
          // touch-action: yatay sürükleme sayfayı kaydırmasın
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent [touch-action:none] [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
        />
      </div>

      <div className="mt-2 flex justify-between">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{min}</span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {max}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
    </div>
  );
}
