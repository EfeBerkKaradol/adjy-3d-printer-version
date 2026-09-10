"use client";

import { RotateCcw } from "lucide-react";
import type { ModelParameter } from "../types";

// ==========================================
// ÖLÇÜ DÜZENLEME
//
// Her ölçü hem sürgüyle hem sayı girişiyle değişebilir:
// sürgü keşif için, sayı girişi bilinen bir ölçüyü tam
// girmek için. Değer değişir değişmez model yeniden kurulur.
// ==========================================

interface ParameterEditorProps {
  parameters: ModelParameter[];
  onChange: (id: string, value: number) => void;
  onReset: () => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function ParameterEditor({ parameters, onChange, onReset }: ParameterEditorProps) {
  const changed = parameters.some((p) => p.value !== p.defaultValue);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">Ölçüler</h3>
        {changed && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Sıfırla
          </button>
        )}
      </div>

      <div className="space-y-5">
        {parameters.map((p) => (
          <div key={p.id}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label htmlFor={`param-${p.id}`} className="text-sm">
                {p.label}
                {p.hint && (
                  <span className="ml-2 text-xs text-muted-foreground">{p.hint}</span>
                )}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id={`param-${p.id}`}
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={p.value}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) onChange(p.id, clamp(n, p.min, p.max));
                  }}
                  className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-foreground"
                />
                <span className="w-6 text-xs text-muted-foreground">{p.unit}</span>
              </div>
            </div>
            <input
              type="range"
              aria-label={p.label}
              min={p.min}
              max={p.max}
              step={p.step}
              value={p.value}
              onChange={(e) => onChange(p.id, Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted
                         [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-primary
                         [&::-webkit-slider-thumb]:shadow-md
                         [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
                         [&::-moz-range-thumb]:cursor-pointer
                         [&::-moz-range-thumb]:rounded-full
                         [&::-moz-range-thumb]:border-0
                         [&::-moz-range-thumb]:bg-primary"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
