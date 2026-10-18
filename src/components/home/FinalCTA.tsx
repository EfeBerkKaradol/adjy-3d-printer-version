import Link from "next/link";
import { Reveal } from "./Reveal";
import { ArrowRight, Sliders } from "lucide-react";

// ==========================================
// BÖLÜM 09 — KAPANIŞ
// Sayfanın tek koyu bölümü. Kontrast burada
// kasıtlı: açık zeminde geçen anlatının sonunda
// tek bir cümle ve iki eylem kalır.
// ==========================================

export function FinalCTA() {
  return (
    <section
      className="border-t border-border bg-[#171717] text-[#F5F4F0]"
      aria-label="Başlayın"
    >
      <div className="adjy-container py-24 md:py-36">
        <Reveal className="max-w-4xl">
          <h2 className="adjy-display text-[clamp(2.25rem,6vw,4.5rem)]">
            Nesneler hayatına
            <br />
            uymalı.
          </h2>
          <p className="mt-6 max-w-lg text-lg text-[#F5F4F0]/60">
            Tersi değil.
          </p>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-md bg-[#F5F4F0] px-8 text-[0.9375rem] font-medium text-[#171717] transition-opacity hover:opacity-90"
            >
              Koleksiyonu keşfet
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/products?customizable=true"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-md border border-[#F5F4F0]/25 px-8 text-[0.9375rem] font-medium text-[#F5F4F0] transition-colors hover:border-[#F5F4F0]/60"
            >
              <Sliders className="h-4 w-4" aria-hidden />
              Bir nesne yapılandır
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
