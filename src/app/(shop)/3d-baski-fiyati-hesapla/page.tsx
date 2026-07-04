import type { Metadata } from "next";
import { PriceCalculator } from "@/components/calculator/PriceCalculator";

export const metadata: Metadata = {
  title: "3D Baskı Fiyatı Hesapla",
  description:
    "STL dosyanızı yükleyin, malzeme ve kalite seçin; filament gramajını, baskı süresini ve fiyatı anında öğrenin.",
  openGraph: {
    title: "3D Baskı Fiyatı Hesapla | ADJY",
    description:
      "STL dosyanızı yükleyin, filament gramajını ve baskı fiyatını anında öğrenin.",
  },
};

// ==========================================
// 3D BASKI FİYAT HESAPLAMA SAYFASI
// STL yükle → 3D önizle → gram + süre + fiyat tahmini.
// ==========================================

export default function PriceCalculatorPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">3D Baskı Fiyatı Hesapla</h1>
        <p className="max-w-2xl text-muted-foreground">
          STL dosyanızı yükleyin; modelinizi 3D olarak inceleyin, malzeme ve
          kalite seçeneklerine göre tahmini filament gramajını, baskı süresini
          ve fiyatı anında görün.
        </p>
      </div>

      <PriceCalculator />
    </div>
  );
}
