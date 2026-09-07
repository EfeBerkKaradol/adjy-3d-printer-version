// ==========================================
// FİYAT VE İNDİRİM
//
// İndirim ayrı bir bayrakla değil, tek bir alanla tutulur:
// compareAtPrice ("eski fiyat") basePrice'tan büyükse ürün
// indirimlidir. Böylece "indirimli işaretli ama fiyatı aynı"
// gibi tutarsız bir durum veritabanında oluşamaz.
//
// Tüm yüzeyler (kart, ürün sayfası, indirimler bölümü)
// indirimi buradan hesaplar; oran hiçbir yerde elle yazılmaz.
// ==========================================

export interface PriceInfo {
  /** Ödenecek tutar */
  price: number;
  /** Üstü çizili gösterilecek eski fiyat — indirim yoksa null */
  compareAt: number | null;
  /** Tam sayıya yuvarlanmış indirim yüzdesi — indirim yoksa 0 */
  percent: number;
  hasDiscount: boolean;
}

export function getPriceInfo(
  basePrice: number | string,
  compareAtPrice?: number | string | null
): PriceInfo {
  const price = Number(basePrice);
  const compare =
    compareAtPrice === null || compareAtPrice === undefined
      ? null
      : Number(compareAtPrice);

  const valid =
    compare !== null &&
    Number.isFinite(compare) &&
    Number.isFinite(price) &&
    compare > price &&
    price > 0;

  if (!valid) {
    return { price, compareAt: null, percent: 0, hasDiscount: false };
  }

  return {
    price,
    compareAt: compare,
    percent: Math.round(((compare - price) / compare) * 100),
    hasDiscount: true,
  };
}

/** Tutarı sitede kullanılan tek biçimde yazar */
export function formatPrice(value: number): string {
  return `${value.toFixed(2)} TL`;
}
