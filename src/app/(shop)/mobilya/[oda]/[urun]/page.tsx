import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  modelBul,
  odaBul,
  varsayilanYapilandirma,
} from "@/lib/furniture/catalog";
import { fiyatiYuvarla, mobilyaFiyati } from "@/lib/furniture/pricing";
import { FurnitureConfigurator } from "@/components/furniture/FurnitureConfigurator";
import { mobilyaUrunuBul } from "@/lib/furniture/ensure";

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

/**
 * Sayfa istek anında üretilir.
 *
 * Derleme anında üretilseydi iki şey birden bozulurdu:
 * veritabanı satırları henüz yokken yapılan bir deploy on iki
 * sayfayı 404 olarak dondururdu, ve sayfanın kendi bağlantısını
 * kurması derleme sırasında veritabanına yazmak anlamına
 * gelirdi. Sunucu tarafı burada zaten küçük — asıl iş
 * tarayıcıda, modelin kendisinde.
 */
export const dynamic = "force-dynamic";

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

  // Sepet ve sipariş kalemi gerçek bir ürün satırına bağlanıyor.
  // Satır yoksa açılır — bölümün açık olması elle çalıştırılan
  // bir betiğe bağlı kalmamalı.
  const urunId = await mobilyaUrunuBul(model);
  if (!urunId) notFound();

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
        urunId={urunId}
        odaAdi={odaBilgi.ad}
      />
    </>
  );
}
