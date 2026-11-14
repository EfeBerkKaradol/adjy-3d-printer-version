import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { aracAdresi, aracBul, aracGorseli } from "@/lib/tasarim/catalog";
import { tasarimBaslangicFiyati } from "@/lib/tasarim/pricing";
import { tasarimUrunuBul } from "@/lib/tasarim/ensure";
import { TasarimStudyo } from "@/components/tasarim/TasarimStudyo";
import { getAbsoluteUrl } from "@/lib/url";

// ==========================================
// TASARIM ARACI SAYFASI
//
// Mağazadaki ürün sayfasının karşılığı, ama fotoğrafla değil
// aracın kendisiyle açılıyor: bu ürünün henüz bir hâli yok,
// müşteri kurunca olacak.
//
// Sunucu tarafı küçük — aracı bulur, sepetin bağlanacağı
// ürün satırını açar. Asıl iş tarayıcıda, aracın içinde.
// ==========================================

// Ürün satırı ilk ziyarette açılır; derleme anında
// veritabanına yazılmasın.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ arac: string }>;
}): Promise<Metadata> {
  const { arac: id } = await params;
  const arac = aracBul(id);
  if (!arac) return {};
  const fiyat = tasarimBaslangicFiyati(arac);
  return {
    title: `${arac.ad} — Kendin Tasarla`,
    description: `${arac.aciklama} ${fiyat.toLocaleString("tr-TR")} TL'den, ölçünüze göre.`,
    keywords: arac.anahtarKelimeler,
    alternates: { canonical: aracAdresi(arac.id) },
    openGraph: {
      title: `${arac.ad} | ADJY`,
      description: arac.ozet,
      images: [aracGorseli(arac.id)],
    },
  };
}

export default async function TasarimAraciPage({
  params,
}: {
  params: Promise<{ arac: string }>;
}) {
  const { arac: id } = await params;
  const arac = aracBul(id);
  if (!arac) notFound();

  // Satır açılamazsa sayfa yine açılır: müşteri tasarımını
  // kurabilir, yalnızca sepet düğmesi kapalı kalır. Mobilyada
  // sayfa 404 veriyordu; burada araç tek başına da bir şey
  // gösteriyor, veritabanı kesintisinde kaybolmasın.
  const urunId = await tasarimUrunuBul(arac);
  const fiyat = tasarimBaslangicFiyati(arac);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: arac.ad,
            description: arac.aciklama,
            image: `${getAbsoluteUrl()}${aracGorseli(arac.id)}`,
            brand: { "@type": "Brand", name: "ADJY" },
            offers: {
              "@type": "Offer",
              price: fiyat,
              priceCurrency: "TRY",
              availability: "https://schema.org/MadeToOrder",
              url: `${getAbsoluteUrl()}${aracAdresi(arac.id)}`,
            },
          }),
        }}
      />
      <TasarimStudyo arac={arac} urunId={urunId} />
    </>
  );
}
