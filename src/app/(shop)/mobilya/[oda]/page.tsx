import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ODALAR, odaBul, odaModelleri } from "@/lib/furniture/catalog";
import { OdaDuzeni } from "@/components/furniture/OdaDuzeni";

// ==========================================
// ODA SAYFASI
//
// Odayı seçen kişi artık ne aradığını biliyor; burada tek iş
// ürün tipini göstermek. Düzen girişle aynı — yan menü yerinde
// kalıyor, yalnızca ızgara değişiyor.
// ==========================================

export function generateStaticParams() {
  return ODALAR.map((o) => ({ oda: o.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ oda: string }>;
}): Promise<Metadata> {
  const { oda } = await params;
  const o = odaBul(oda);
  if (!o) return {};
  const modeller = odaModelleri(oda);
  return {
    title: `${o.ad} Mobilyası`,
    description: `${o.ad} için ölçüye özel ${modeller
      .slice(0, 5)
      .map((m) => m.ad.toLowerCase())
      .join(", ")}. Ölçüyü, sütunu ve gözleri siz belirleyin, fiyatı anında görün.`,
    alternates: { canonical: `/mobilya/${oda}` },
    openGraph: {
      title: `${o.ad} Mobilyası | ADJY`,
      description: o.aciklama,
    },
  };
}

export default async function OdaPage({
  params,
}: {
  params: Promise<{ oda: string }>;
}) {
  const { oda } = await params;
  const o = odaBul(oda);
  if (!o) notFound();

  return (
    <OdaDuzeni
      aktifOda={oda}
      modeller={odaModelleri(oda)}
      baslik={o.ad}
      aciklama={`${o.aciklama}. Bir ürün seçin, ölçüsünü kendi odanıza göre kurun.`}
    />
  );
}
