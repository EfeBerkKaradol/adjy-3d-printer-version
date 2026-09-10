import type { Metadata } from "next";
import { PhotoToProduct } from "@/features/photo-to-product/components/PhotoToProduct";

export const metadata: Metadata = {
  title: "Fotoğraftan 3D Ürün Oluştur",
  description:
    "Bir fotoğraf yükle, objeyi 3D modele dönüştür, ölçülerini değiştir, odanda gör ve üret.",
  openGraph: {
    title: "Fotoğraftan 3D Ürün Oluştur | ADJY Shopping",
    description:
      "Bir fotoğraf yükle, objeyi 3D modele dönüştür, ölçülerini değiştir, odanda gör ve üret.",
  },
};

// ==========================================
// FOTOĞRAFTAN 3D ÜRÜNE
//
// Kendi başına tam bir oluşturma deneyimi — başka bir
// sayfanın içine açılan bir pencere değil.
// ==========================================

export default async function PhotoToProductPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const { model } = await searchParams;

  return (
    <div className="adjy-container adjy-section">
      <header className="mb-12 max-w-2xl">
        <p className="adjy-eyebrow mb-5">Üret</p>
        <h1 className="adjy-display text-[clamp(1.9rem,4.2vw,3rem)]">
          Fotoğraftan 3D ürüne.
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          Beğendiğin bir objeyi fotoğrafla. ADJY onu düzenleyebileceğin ve
          üretebileceğin bir 3D modele dönüştürsün.
        </p>
      </header>

      <PhotoToProduct modelId={model} />
    </div>
  );
}
