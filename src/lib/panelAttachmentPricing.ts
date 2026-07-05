import { prisma } from "@/lib/db";
import { PANEL_ATTACHMENTS } from "@/components/3d/panelAttachments";

// ==========================================
// PANEL EKLENTİSİ FİYATLANDIRMA
//
// Eklenti fiyatları, eklentinin sitedeki bağımsız ürün
// kaydının (slug eşleşmesi) güncel basePrice değerinden
// gelir. Sipariş API'si fiyatı sunucuda yeniden hesapladığı
// için bu yardımcı hem istemci gösterimi hem sunucu
// doğrulaması tarafından kullanılan tek gerçek kaynaktır.
// ==========================================

/** customParams.attachments ("a,b,c") içinden kayıtlı eklenti slug'larını çıkarır */
export function parseAttachmentIds(params: Record<string, unknown> | null | undefined): string[] {
  const raw = params?.attachments;
  if (typeof raw !== "string" || !raw) return [];
  const known = new Set(PANEL_ATTACHMENTS.map((a) => a.id));
  return raw.split(",").filter((id) => known.has(id));
}

/** Verilen eklenti slug'ları için { slug → basePrice } haritası döndürür */
export async function getAttachmentPriceMap(slugs: string[]): Promise<Map<string, number>> {
  if (slugs.length === 0) return new Map();
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: { slug: true, basePrice: true },
  });
  return new Map(products.map((p) => [p.slug, Number(p.basePrice)]));
}
