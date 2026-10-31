import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  MODELLER,
  modelBul,
  odaBul,
  varsayilanYapilandirma,
} from "@/lib/furniture/catalog";
import { fiyatiYuvarla, mobilyaFiyati } from "@/lib/furniture/pricing";
import { FurnitureConfigurator } from "@/components/furniture/FurnitureConfigurator";
import { furnitureSku } from "@/lib/furniture/sku";

// ==========================================
// YAPILANDIRICI SAYFASI
//
// Mağazadaki ürün sayfasının karşılığı, ama fotoğrafla değil
// modelle açılıyor. Sebebi basit: bu ürünün fotoğrafı yok,
// çünkü henüz hangi ölçüde olacağı belli değil.
//
// Sepete giderken gerçek bir veritabanı ürünü gerekiyor
// (sipariş kalemi ona bağlanıyor). O ürün yalnızca bir
// bağlantı noktası; ölçü, sütun ve gözler yapılandırma olarak
// onun üstünde taşınıyor.
// ==========================================

export function generateStaticParams() {
  return MODELLER.map((m) => ({ oda: m.oda, urun: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ oda: string; urun: string }>;
}): Promise<Metadata> {
  const { oda, urun } = await params;
  const model = modelBul(urun);
  if (!model || model.oda !== oda) return {};
  const fiyat = fiyatiYuvarla(
    mobilyaFiyati(varsayilanYapilandirma(model), {
      iscilikCarpani: model.iscilikCarpani,
    }).toplam
  );
  return {
    title: `${model.ad} — Ölçüye Özel`,
    description: `${model.aciklama} ${model.genislik.min / 10}–${
      model.genislik.max / 10
    } cm genişlik aralığında üretilir. ${fiyat.toLocaleString(
      "tr-TR"
    )} TL'den başlayan fiyatlarla.`,
    keywords: model.anahtarKelimeler,
    alternates: { canonical: `/mobilya/${oda}/${urun}` },
    openGraph: {
      title: `${model.ad} | ADJY`,
      description: model.ozet,
    },
  };
}

export default async function YapilandiriciPage({
  params,
}: {
  params: Promise<{ oda: string; urun: string }>;
}) {
  const { oda, urun } = await params;
  const model = modelBul(urun);
  const odaBilgi = odaBul(oda);
  if (!model || !odaBilgi || model.oda !== oda) notFound();

  const urunKaydi = await prisma.product.findUnique({
    where: { sku: furnitureSku(model.id) },
    select: { id: true },
  });

  // Ürün kaydı yoksa sepete eklenemez; sessizce kırık bir
  // "Sepete ekle" göstermek yerine sayfayı hiç açmıyoruz.
  if (!urunKaydi) notFound();

  const varsayilan = varsayilanYapilandirma(model);
  const fiyat = fiyatiYuvarla(
    mobilyaFiyati(varsayilan, { iscilikCarpani: model.iscilikCarpani }).toplam
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: model.ad,
            description: model.aciklama,
            category: odaBilgi.ad,
            brand: { "@type": "Brand", name: "ADJY" },
            offers: {
              "@type": "Offer",
              price: fiyat,
              priceCurrency: "TRY",
              availability: "https://schema.org/MadeToOrder",
              url: `https://www.adjyshopping.com/mobilya/${oda}/${urun}`,
            },
          }),
        }}
      />
      <FurnitureConfigurator
        model={model}
        urunId={urunKaydi.id}
        odaAdi={odaBilgi.ad}
      />
    </>
  );
}
