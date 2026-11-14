import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { aracAdresi, aracBul } from "@/lib/tasarim/catalog";
import { tasarimUrunuBul } from "@/lib/tasarim/ensure";
import { TasarimStudyo } from "@/components/tasarim/TasarimStudyo";

// ==========================================
// ÖZELLEŞTİRME SAYFASI
//
// Ürün sayfasından "Özelleştir" ile gelinir. Tasarım aracı
// burada, bütün ayarları açık hâlde çalışır; müşteri modeli
// kurar ve sepete ekler.
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
  return {
    title: `${arac.ad} — Özelleştir`,
    description: arac.ozet,
    // Arama sonucunda ürünün tanıtım sayfası çıksın; bu sayfa
    // onun bir adımı.
    alternates: { canonical: aracAdresi(arac.id) },
    robots: { index: false, follow: true },
  };
}

export default async function OzellestirmePage({
  params,
}: {
  params: Promise<{ arac: string }>;
}) {
  const { arac: id } = await params;
  const arac = aracBul(id);
  if (!arac) notFound();

  // Satır açılamazsa sayfa yine açılır: müşteri tasarımını
  // kurabilir, yalnızca sepet düğmesi kapalı kalır.
  const urunId = await tasarimUrunuBul(arac);

  return <TasarimStudyo arac={arac} urunId={urunId} />;
}
