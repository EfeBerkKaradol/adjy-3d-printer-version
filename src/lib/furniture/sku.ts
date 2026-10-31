/**
 * Mobilya modellerinin veritabanı karşılığı tek bir SKU ile
 * bulunur. Sepet ve sipariş kalemi gerçek bir ürün satırına
 * bağlanmak zorunda; yapılandırma o satırın üstünde taşınıyor.
 */
export function furnitureSku(modelId: string): string {
  return `MOB-${modelId.toUpperCase()}`;
}
