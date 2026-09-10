import type { Metadata } from "next";
import { PriceCalculator } from "@/components/calculator/PriceCalculator";

export const metadata: Metadata = {
  title: "Model Yükle",
  description:
    "3D modelini yükle, malzeme ve kalite seç; gramajı, baskı süresini ve fiyatı anında gör.",
  openGraph: {
    title: "Model Yükle | ADJY Shopping",
    description: "3D modelini yükle, ölçülerini belirle ve üret.",
  },
};

// ==========================================
// KENDİ MODELİNİ YÜKLE
//
// Mevcut fiyat hesaplayıcı akışı Üret başlığı altına alındı.
// Bileşen yeniden yazılmadı; yalnızca doğru yerden erişiliyor.
// ==========================================

export default function ModelUploadPage() {
  return (
    <div className="adjy-container adjy-section">
      <header className="mb-10 max-w-2xl">
        <p className="adjy-eyebrow mb-5">Üret</p>
        <h1 className="adjy-display text-[clamp(1.9rem,4.2vw,3rem)]">
          Kendi modelini yükle.
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          3D modelini yükle; ölçülerini belirle, malzemeni seç ve fiyatını anında gör.
        </p>
      </header>

      <PriceCalculator />
    </div>
  );
}
