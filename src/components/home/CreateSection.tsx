import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  MAX_MODEL_DIMENSION_MM,
} from "@/lib/slicer";
import { ArrowRight, Upload } from "lucide-react";

// ==========================================
// BÖLÜM 05 — KENDİ MODELİNİ ÜRET
// Dosya kısıtları uygulamanın gerçek sabitlerinden
// okunur; hesaplayıcı değişirse burası da değişir.
// ==========================================

const STEPS = [
  { label: "Yükle", detail: "STL dosyanı sürükle" },
  { label: "Analiz", detail: "Hacim ve süre çıkarılır" },
  { label: "Yapılandır", detail: "Malzeme, kalite, adet" },
  { label: "Teklif", detail: "Fiyatı anında gör" },
  { label: "Üretim", detail: "Baskıya alınır" },
];

export function CreateSection() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="adjy-container adjy-section">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div className="max-w-xl">
            <p className="adjy-eyebrow mb-5">Üret</p>
            <h2 className="adjy-display text-[clamp(1.875rem,3.8vw,3rem)]">
              Kendi 3D modelin mi var?
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Modelini yükle, üretimi ADJY halletsin. Dosyan otomatik analiz
              edilir; malzeme, baskı kalitesi ve adedi seçtiğin anda fiyatını
              görürsün.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/3d-baski-fiyati-hesapla">
                  <Upload className="h-4 w-4" aria-hidden />
                  Üretim teklifi al
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/faq">
                  Nasıl çalışır
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <p className="mt-7 text-xs text-muted-foreground">
              Desteklenen format{" "}
              <span className="font-medium text-foreground">
                {ACCEPTED_EXTENSIONS.join(", ")}
              </span>{" "}
              · En fazla{" "}
              <span className="font-medium text-foreground">{MAX_FILE_SIZE_MB} MB</span> ·
              Maksimum kenar{" "}
              <span className="font-medium text-foreground">
                {MAX_MODEL_DIMENSION_MM} mm
              </span>
            </p>
          </div>

          {/* Akış */}
          <ol className="divide-y divide-border border-y border-border">
            {STEPS.map((step, i) => (
              <li key={step.label} className="flex items-baseline gap-5 py-5">
                <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="block text-base font-medium">{step.label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {step.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
