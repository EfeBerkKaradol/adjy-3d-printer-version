"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ManufacturabilityResult } from "../types";

// ==========================================
// ÜRETİLEBİLİRLİK DURUMU
// Teknik rapor değil, tek cümlelik sonuç.
// ==========================================

export function ManufacturabilityStatus({ result }: { result: ManufacturabilityResult }) {
  const Icon =
    result.level === "ok" ? CheckCircle2 : result.level === "adjustable" ? Info : AlertTriangle;

  return (
    <div className="flex gap-2.5 border-t border-border pt-4">
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          result.level === "unsuitable" ? "text-destructive" : "text-muted-foreground"
        }`}
        aria-hidden
      />
      <div>
        <p className="text-sm font-medium">{result.title}</p>
        {result.detail && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{result.detail}</p>
        )}
      </div>
    </div>
  );
}
