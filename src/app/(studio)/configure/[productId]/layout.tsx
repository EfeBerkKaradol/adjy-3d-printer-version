import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { slugdanAracId, aracAdresi } from "@/lib/tasarim/catalog";

// ==========================================
// ESKİ KONFİGÜRATÖR ADRESİ
//
// Hazır ürünlerin ölçüsü artık ayarlanmıyor; ayarlanabilir
// ürünler Kendin Üret araçları. Eski /configure/<id> bağlantıları
// (paylaşılmış, arama motorunda kalmış) ürünün kendi sayfasına,
// tasarım ürünüyse aracına gider.
// ==========================================

export default async function ConfigureYonlendirme({
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const urun = await prisma.product
    .findUnique({ where: { id: productId }, select: { slug: true } })
    .catch(() => null);
  if (!urun) notFound();

  const arac = slugdanAracId(urun.slug);
  redirect(arac ? aracAdresi(arac) : `/products/${urun.slug}`);
}
