"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  FILAMENT_COLORS,
  INFILL_OPTIONS,
  LAYER_HEIGHTS,
  MATERIALS,
} from "@/lib/slicer";

// ==========================================
// MALZEME VE BASKI SEÇENEKLERİ
//
// Malzeme ve renk önde; katman yüksekliği ile doluluk oranı
// "Gelişmiş" başlığının altında. Kullanıcı ilk bakışta otuz
// kontrol görmemeli — ileri seçenekler isteyen açar.
//
// Liste ADJY'nin mevcut baskı malzemeleridir; bu ekran için
// ayrı bir malzeme tanımı üretilmedi.
// ==========================================

export interface PrintOptions {
  materialId: string;
  colorId: string;
  layerHeight: number;
  infillPercent: number;
}

interface MaterialSelectorProps {
  value: PrintOptions;
  onChange: (next: PrintOptions) => void;
}

export function MaterialSelector({ value, onChange }: MaterialSelectorProps) {
  const [advanced, setAdvanced] = useState(false);
  const set = (patch: Partial<PrintOptions>) => onChange({ ...value, ...patch });

  return (
    <section>
      <h3 className="mb-3 text-sm font-medium">Malzeme</h3>

      <div className="flex flex-wrap gap-2">
        {MATERIALS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => set({ materialId: m.id })}
            aria-pressed={value.materialId === m.id}
            title={m.description}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              value.materialId === m.id
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/40"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <h3 className="mb-3 mt-6 text-sm font-medium">Renk</h3>
      <div className="flex flex-wrap gap-2">
        {FILAMENT_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => set({ colorId: c.id })}
            aria-pressed={value.colorId === c.id}
            title={c.name}
            aria-label={c.name}
            className={`h-7 w-7 rounded-full border transition-transform ${
              value.colorId === c.id
                ? "scale-110 border-foreground ring-2 ring-foreground/20"
                : "border-border hover:scale-105"
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={advanced}
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform ${advanced ? "rotate-180" : ""}`}
          aria-hidden
        />
        Gelişmiş baskı ayarları
      </button>

      {advanced && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div>
            <p className="mb-2 text-sm">Baskı kalitesi</p>
            <div className="flex flex-wrap gap-2">
              {LAYER_HEIGHTS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set({ layerHeight: l.value })}
                  aria-pressed={value.layerHeight === l.value}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    value.layerHeight === l.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="infill" className="mb-2 block text-sm">
              Doluluk · <span className="tabular-nums">{value.infillPercent}%</span>
            </label>
            <select
              id="infill"
              value={value.infillPercent}
              onChange={(e) => set({ infillPercent: Number(e.target.value) })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            >
              {INFILL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}%
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </section>
  );
}
