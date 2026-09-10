"use client";

import { Check, Loader2 } from "lucide-react";
import { PIPELINE_STEPS, type PipelineStepId } from "../types";

// ==========================================
// ANALİZ EKRANI
//
// Yüzde yerine adım gösterilir: gerçek oran bilinmediği için
// dolan bir çubuk yanıltıcı olurdu. Kullanıcı hangi aşamada
// olduğunu okur, boş bir ekranda beklemez.
// ==========================================

export function AnalysisProgress({ current }: { current: PipelineStepId }) {
  const index = PIPELINE_STEPS.findIndex((s) => s.id === current);

  return (
    <div className="mx-auto max-w-sm">
      <p className="adjy-eyebrow mb-6">Objeni analiz ediyoruz</p>
      <ol className="space-y-3.5">
        {PIPELINE_STEPS.map((step, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <li
              key={step.id}
              className={`flex items-center gap-3 text-sm transition-colors ${
                active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/45"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                )}
              </span>
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
