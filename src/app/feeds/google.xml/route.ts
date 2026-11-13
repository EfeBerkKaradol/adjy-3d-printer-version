import { prisma } from "@/lib/db";
import { getAbsoluteUrl } from "@/lib/url";
import { clampDescription } from "@/lib/seo";

// ==========================================
// GOOGLE MERCHANT CENTER ÜRÜN FEED'İ
//
// Merchant Center → Ürünler → Ürün kaynakları → "Planlı getirme"
// ile bu adres verilir: https://www.adjyshopping.com/feeds/google.xml
//
// /api/ altında değil, çünkü robots.txt /api/'yi kapatıyor;
// Google'ın feed'i çekebilmesi için açık bir yolda duruyor.
//
// Kurallar:
// - Google SVG görsel kabul etmiyor. Yalnızca SVG görseli olan
//   ürün feed'e girerse "geçersiz görsel" ile reddedilir; o
//   ürünler gerçek fotoğrafı yüklenene kadar dışarıda kalır.
// - İndirimli üründe price = üstü çizili fiyat, sale_price =
//   satış fiyatı. Sayfada görünen fiyatla birebir aynı olmalı.
// - GTIN yok (kendi üretimimiz), bu yüzden marka + MPN (SKU)
//   veriliyor; SKU yoksa identifier_exists=no.
// ==========================================

export const dynamic = "force-dynamic";

const BRAND = "ADJY";
const CURRENCY = "TRY";
const MAX_ADDITIONAL_IMAGES = 10;

function xmlEscape(value: string): string {
  return value
    // XML 1.0'da geçersiz kontrol karakterleri feed'i bozar
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function money(value: number): string {
  return `${value.toFixed(2)} ${CURRENCY}`;
}

function absolute(url: string, base: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Google'ın kabul ettiği görsel mi? (SVG ve boş yollar elenir) */
function isUsableImage(url: string): boolean {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  return path.length > 0 && !path.endsWith(".svg");
}

function readGallery(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) return [];
  return gallery.filter((g): g is string => typeof g === "string" && g.length > 0);
}

function tag(name: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `      <${name}>${xmlEscape(value)}</${name}>\n`;
}

export async function GET() {
  const base = getAbsoluteUrl();

  const products = await prisma.product.findMany({
    where: { isActive: true, category: { isActive: true } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      description: true,
      basePrice: true,
      compareAtPrice: true,
      thumbnailUrl: true,
      gallery: true,
      stockQty: true,
      materialType: true,
      parameters: { select: { id: true }, take: 1 },
      category: {
        select: { name: true, parent: { select: { name: true } } },
      },
    },
  });

  const items: string[] = [];

  for (const p of products) {
    const images = [
      ...new Set(
        [p.thumbnailUrl, ...readGallery(p.gallery)]
          .filter((src): src is string => Boolean(src))
          .filter(isUsableImage)
          .map((src) => absolute(src, base))
      ),
    ];
    // Görselsiz ürün Merchant Center'da zaten reddedilir
    if (images.length === 0) continue;

    const price = Number(p.basePrice);
    if (!(price > 0)) continue;
    const compareAt = p.compareAtPrice ? Number(p.compareAtPrice) : null;
    const onSale = compareAt !== null && compareAt > price;

    const description = clampDescription(
      (p.description || `${p.name} — ADJY atölyesinde üretilir.`).trim(),
      4900
    );
    const productType = p.category.parent
      ? `${p.category.parent.name} > ${p.category.name}`
      : p.category.name;

    let block = "    <item>\n";
    block += tag("g:id", p.sku || p.id);
    block += tag("g:title", p.name.slice(0, 150));
    block += tag("g:description", description);
    block += tag("g:link", `${base}/products/${p.slug}`);
    block += tag("g:image_link", images[0]);
    for (const extra of images.slice(1, 1 + MAX_ADDITIONAL_IMAGES)) {
      block += tag("g:additional_image_link", extra);
    }
    block += tag("g:availability", p.stockQty > 0 ? "in_stock" : "out_of_stock");
    block += tag("g:price", money(onSale ? compareAt! : price));
    if (onSale) block += tag("g:sale_price", money(price));
    block += tag("g:condition", "new");
    block += tag("g:brand", BRAND);
    if (p.sku) {
      block += tag("g:mpn", p.sku);
    } else {
      block += tag("g:identifier_exists", "no");
    }
    block += tag("g:product_type", productType);
    if (p.materialType) block += tag("g:material", p.materialType);
    // Ölçüsü/rengi seçilebilen ürünler sipariş üzerine üretilir
    if (p.parameters.length > 0) block += tag("g:custom_label_0", "ozellestirilebilir");
    block += "    </item>";

    items.push(block);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ADJY</title>
    <link>${xmlEscape(base)}</link>
    <description>ADJY ürün kataloğu</description>
${items.join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
